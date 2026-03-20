import { SpawnOptions, spawn } from "child_process";
import internal from "stream";
import { ErrorWithMeta } from "./utils";
import { Logger } from "@normed/log-flour";

class PromiseLatch {
  private resolve: (() => void) | null = null;
  private reject: ((reason?: any) => void) | null = null;
  private promise: Promise<void>;

  private end(success: true): void;
  private end(success: false, reason: unknown): void;
  private end(success: boolean, reason?: unknown) {
    const call: null | (() => void) = success
      ? this.resolve
      : this.reject?.bind(this.reject, reason);
    this.resolve = null;
    this.reject = null;
    call?.();
  }

  constructor(private count: number) {
    this.promise = new Promise<void>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  hit() {
    if (--this.count <= 0) {
      this.end(true);
    }
  }

  /**
   * Fail the latch with a reason
   *
   * @param reason
   */
  fail(reason?: unknown) {
    this.end(false, reason);
  }

  /**
   * Resolves when the latch is reduced to zero
   */
  async wait() {
    return this.promise;
  }
}

export async function run(
  ...args: Parameters<typeof _run>
): ReturnType<typeof _run> {
  const logger = args[2]?.logger;
  let result: Awaited<ReturnType<typeof _run>> | null = null;
  let error: Error | null = null;
  try {
    return (result = await _run(...args));
  } catch (e) {
    if (e instanceof Error) {
      error = e;
    } else {
      error = new Error("" + e);
    }
    throw e;
  } finally {
    if (error !== null) {
      logger?.error(`Failed to run command`, error, {
        command: args[0],
        args: args[1],
      });
    } else {
      logger?.debug(`Ran command`, {
        command: args[0],
        args: args[1],
        result,
      });
    }
  }
}

type RunOptions = Partial<{
  logger: Logger;
  stdout: boolean;
  stderr: boolean;
  errorOnNonZeroExitCode: boolean;
  spawnOptions: SpawnOptions;
  hooks: Partial<{
    prespawn: (command: string, args: string[], options: RunOptions) => void;
    postspawn: (command: string, args: string[], options: RunOptions) => void;
    stderrChunk: (
      chunk: string,
      command: string,
      args: string[],
      options: RunOptions,
    ) => boolean;
    stdoutChunk: (
      chunk: string,
      command: string,
      args: string[],
      options: RunOptions,
    ) => boolean;
    exit: (
      code: number | null,
      signal: NodeJS.Signals | null,
      command: string,
      args: string[],
      options: RunOptions,
    ) => true | void;
  }>;
}>;

async function _run(
  command: string,
  args: string[] = [],
  options: RunOptions = {},
): Promise<{
  stdout: string | null;
  stderr: string | null;
  exitCode: number | null;
  exitSignal: NodeJS.Signals | null;
}> {
  options.hooks?.prespawn?.(command, args, options);
  const child = spawn(command, args, options.spawnOptions ?? {});
  options.hooks?.postspawn?.(command, args, options);

  function chunk(
    stream: internal.Readable,
    hook?: (
      chunk: string,
      command: string,
      args: string[],
      options: RunOptions,
    ) => boolean,
  ): Promise<string> & { progress: string } {
    let pass: (d: string) => void = () => {};
    let fail: (e: Error) => void = () => {};
    const promise = Object.assign(
      new Promise<string>((p, f) => {
        pass = p;
        fail = f;
      }),
      { progress: "" },
    );

    (async () => {
      for await (const chunk of stream) {
        if (hook?.(chunk, command, args, options) ?? true) {
          promise.progress += chunk;
        }
      }
      return promise.progress;
    })().then(pass, fail);

    return promise;
  }
  const stdout =
    options.stdout && child.stdout
      ? chunk(child.stdout, options.hooks?.stdoutChunk)
      : null;
  const stderr =
    options.stderr && child.stderr
      ? chunk(child.stderr, options.hooks?.stderrChunk)
      : null;

  const latch = new PromiseLatch(1);
  let exitCode: number | null = null;
  let exitSignal: NodeJS.Signals | null = null;
  child.on("exit", (code, signal) => {
    exitCode = code;
    exitSignal = signal;

    try {
      const result = options.hooks?.exit?.(
        code,
        signal,
        command,
        args,
        options,
      );
      if (result === true) {
        return latch.hit();
      }
    } catch (e: unknown) {
      // @ts-expect-error : we are letting the user throw whatever they want here. It *should* be an error, but we don't want to coerce it if it isn't.
      return barrier.fail(e);
    }

    if (options.errorOnNonZeroExitCode && code) {
      latch.fail(
        new ErrorWithMeta(
          `non-zero exit code`,
          {
            command,
            args,
            exitCode,
            exitSignal,
            stdout: stdout?.progress ?? null,
            stderr: stderr?.progress ?? null,
          },
          `RunError`,
        ),
      );
    } else if (options.errorOnNonZeroExitCode && signal) {
      latch.fail(
        new ErrorWithMeta(
          `received signal`,
          {
            exitCode,
            exitSignal,
            stdout: stdout?.progress ?? null,
            stderr: stderr?.progress ?? null,
          },
          `RunError`,
        ),
      );
    } else {
      latch.hit();
    }
  });

  child.on("error", (e) => {
    latch.fail(e);
  });

  await latch.wait();

  return {
    stdout: await stdout,
    stderr: await stderr,
    exitCode,
    exitSignal,
  };
}
