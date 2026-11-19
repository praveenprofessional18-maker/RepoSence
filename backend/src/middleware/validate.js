export function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const error = new Error("Request validation failed.");
      error.name = "ZodError";
      error.issues = result.error.issues;
      next(error);
      return;
    }
    req.validated = { ...(req.validated || {}), [source]: result.data };
    if (source === "body") req.body = result.data;
    next();
  };
}
