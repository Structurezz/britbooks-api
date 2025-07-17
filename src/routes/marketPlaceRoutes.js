import express from 'express';
import {
  handleCreateListing,
  handleUpdateListing,
  handleArchiveListing,
  handleGetAdminListings,
  handleGetPublishedListings,
  handleGetListingById,
  handleSearchListings,
  handleIncrementViews,
  handleMarkAsPurchased,
  handlePublishStatus,
  handleDeleteListing,
  handleBulkUpdate,
  handleModerationFlag,
  handleListingStats,
  handleCSVSync,
} from '../app/controllers/MarketPlaceController.js';

const router = express.Router();

router.post('/', handleCreateListing);
router.put('/:id', handleUpdateListing);
router.patch('/:id/archive', handleArchiveListing);
router.get('/admin', handleGetAdminListings);
router.get('/published', handleGetPublishedListings);
router.get('/search', handleSearchListings);
router.get('/stats', handleListingStats);
router.get('/:id', handleGetListingById);
router.post('/csv-sync', handleCSVSync);

router.post('/:id/views', handleIncrementViews);
router.post('/:id/purchase', handleMarkAsPurchased);
router.post('/:id/publish', handlePublishStatus);
router.delete('/:id', handleDeleteListing);

router.post('/bulk-update', handleBulkUpdate);
router.post('/:id/moderation-flag', handleModerationFlag);

export default router;
