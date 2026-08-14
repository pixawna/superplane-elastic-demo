type Fields = Record<string, unknown>;

function write(level: "info" | "warn" | "error", event: string, fields: Fields = {}) {
  const safeFields = Object.fromEntries(
    Object.entries(fields).filter(([key]) => !/token|secret|authorization|api.?key/i.test(key)),
  );
  console[level](
    JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...safeFields }),
  );
}

export const logger = {
  info: (event: string, fields?: Fields) => write("info", event, fields),
  warn: (event: string, fields?: Fields) => write("warn", event, fields),
  error: (event: string, fields?: Fields) => write("error", event, fields),
};
