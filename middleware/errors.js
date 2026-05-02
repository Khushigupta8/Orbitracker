export function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) console.error("[error]", err);
  if (status === 400 && err.details) {
    console.error("[validation]", req.method, req.originalUrl, JSON.stringify(err.details, null, 2));
  }
  res.status(status).json({
    error: err.message || "Internal server error",
    ...(err.details ? { details: err.details } : {}),
  });
}
