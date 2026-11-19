export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error?.name === "ZodError") {
    res.status(400).json({
      success: false,
      message: "Request validation failed.",
      errors: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
    return;
  }

  if (error?.name === "CastError") {
    error.statusCode = 400;
    error.publicMessage = "The supplied identifier is invalid.";
  } else if (error?.code === 11000) {
    error.statusCode = 409;
    error.publicMessage = "A record with that value already exists.";
  } else if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") {
    error.statusCode = 401;
    error.publicMessage = "The authentication token is invalid or expired.";
  } else if (error?.isAxiosError) {
    error.statusCode = error.response?.status >= 500 ? 502 : (error.response?.status || 502);
    error.publicMessage = error.response?.data?.message || "A request to an external service failed.";
  }

  const requestedStatus = Number(error.statusCode || error.status);
  const statusCode = Number.isInteger(requestedStatus)
    && requestedStatus >= 400
    && requestedStatus <= 599
    ? requestedStatus
    : 500;
  const message = statusCode >= 500
    ? "Internal server error."
    : error.publicMessage || error.message || "Request failed.";
  const response = { success: false, message };

  if (Array.isArray(error.publicErrors)) {
    response.errors = error.publicErrors;
  }

  res.status(statusCode).json(response);
}
