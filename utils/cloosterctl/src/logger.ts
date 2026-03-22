const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LEVELS;

const COLOURS: Record<LogLevel, string> = {
  debug: "\x1b[90m",
  info: "\x1b[36m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
};
const NAME_COLOUR = "\x1b[35m";
const META_COLOUR = "\x1b[90m";
const RESET = "\x1b[0m";

function formatMeta(meta: Record<string, unknown>): string {
  const entries = Object.entries(meta);
  if (!entries.length) return "";
  return entries
    .map(
      ([k, v]) => `    ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`,
    )
    .join("\n");
}

export class Logger {
  private minLevel: number = LEVELS.info;

  constructor(private name: string) {}

  setMinLogLevel(level: LogLevel) {
    this.minLevel = LEVELS[level];
  }

  debug(message: string, meta?: Record<string, unknown>) {
    this.log("debug", message, undefined, meta);
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.log("info", message, undefined, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.log("warn", message, undefined, meta);
  }

  error(
    messageOrError: string | Error,
    error?: Error,
    meta?: Record<string, unknown>,
  ) {
    if (messageOrError instanceof Error) {
      this.log("error", messageOrError.message, messageOrError);
    } else {
      this.log("error", messageOrError, error, meta);
    }
  }

  private log(
    level: LogLevel,
    message: string,
    error?: Error,
    meta?: Record<string, unknown>,
  ) {
    if (LEVELS[level] < this.minLevel) return;

    const parts: string[] = [
      `[${COLOURS[level]}${level}${RESET} - ${NAME_COLOUR}${this.name}${RESET}] ${message}`,
    ];

    if (error) {
      parts.push(`${META_COLOUR}    ${error.stack ?? error.message}${RESET}`);
    }

    if (meta) {
      const formatted = formatMeta(meta);
      if (formatted) parts.push(`${META_COLOUR}${formatted}${RESET}`);
    }

    const fn = level === "error" ? console.error : console.log;
    fn(parts.join("\n"));
  }
}
