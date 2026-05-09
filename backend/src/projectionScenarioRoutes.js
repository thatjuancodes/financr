const { createProjectionScenarioService } = require("./projections/projections.service");

function registerProjectionScenarioRoutes(app, deps) {
  const service = createProjectionScenarioService(deps);

  function asyncHandler(handler) {
    return async (req, res, next) => {
      try {
        await handler(req, res);
      } catch (error) {
        next(error);
      }
    };
  }

  app.get(
    "/projection-scenarios",
    asyncHandler(async (req, res) => {
      res.json(await service.list(req.query));
    })
  );

  app.post(
    "/projection-scenarios/preview",
    asyncHandler(async (req, res) => {
      res.json(await service.preview(req.body));
    })
  );

  app.post(
    "/projection-scenarios",
    asyncHandler(async (req, res) => {
      res.status(201).json(await service.create(req.body));
    })
  );

  app.get(
    "/projection-scenarios/:id",
    asyncHandler(async (req, res) => {
      res.json(await service.getById(req.params.id));
    })
  );

  app.put(
    "/projection-scenarios/:id",
    asyncHandler(async (req, res) => {
      res.json(await service.update(req.params.id, req.body));
    })
  );

  app.delete(
    "/projection-scenarios/:id",
    asyncHandler(async (req, res) => {
      res.json(await service.remove(req.params.id));
    })
  );

  app.post(
    "/projection-scenarios/:id/duplicate",
    asyncHandler(async (req, res) => {
      res.status(201).json(await service.duplicate(req.params.id));
    })
  );
}

module.exports = {
  registerProjectionScenarioRoutes,
};
