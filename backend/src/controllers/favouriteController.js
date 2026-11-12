const service = require('../services/favouriteService');
const { success } = require('../utils/response');

async function addFavourite(req, res, next) {
  try { return success(res, 201, 'Favourite added successfully', await service.addFavourite(req.user, req.params.id, req.body)); }
  catch (err) { return next(err); }
}
async function listFavourites(req, res, next) {
  try { return success(res, 200, 'Favourites retrieved successfully', await service.listFavourites(req.user, req.params.id)); }
  catch (err) { return next(err); }
}
async function removeFavourite(req, res, next) {
  try { return success(res, 200, 'Favourite removed successfully', await service.removeFavourite(req.user, req.params.favouriteId)); }
  catch (err) { return next(err); }
}

module.exports = { addFavourite, listFavourites, removeFavourite };
