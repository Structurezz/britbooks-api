import {
    bulkSyncFromCSV,
    createListing,
    updateListing,
    archiveListing,
    getAllListingsForAdmin,
    getPublishedListings,
    getListingById,
    searchListings,
    incrementViews,
    markAsPurchased,
    setPublishStatus,
    deleteListingPermanently,
    bulkUpdateListings,
    flagListingAsModerationNeeded,
    getListingStats,
  } from '../services/marketPlaceService.js';
  
  export const handleCreateListing = async (req, res) => {
    try {
      const listing = await createListing(req.body);
      res.status(201).json({ success: true, listing });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  
  export const handleUpdateListing = async (req, res) => {
    try {
      const listing = await updateListing(req.params.id, req.body);
      res.json({ success: true, listing });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  
  export const handleArchiveListing = async (req, res) => {
    try {
      const listing = await archiveListing(req.params.id);
      res.json({ success: true, listing });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  
  export const handleGetAdminListings = async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        includeArchived = false,
        sort = 'createdAt',
        order = 'desc',
        ...filters
      } = req.query;
  
      const parsedPage = parseInt(page);
      const parsedLimit = parseInt(limit);
      const parsedIncludeArchived = includeArchived === 'true';
  
      const listings = await getAllListingsForAdmin({
        page: parsedPage,
        limit: parsedLimit,
        includeArchived: parsedIncludeArchived,
        sort,
        order,
        filters,
      });
  
      res.status(200).json({
        success: true,
        listings,
        meta: {
          page: parsedPage,
          limit: parsedLimit,
          sort,
          order,
          count: listings.length,
        },
      });
    } catch (err) {
      console.error('❌ Failed to get admin listings:', err.message);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve listings. Please try again later.',
      });
    }
  };
  
  export const handleGetPublishedListings = async (req, res) => {
    try {
      const listings = await getPublishedListings(req.query);
      res.json({ success: true, listings });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  
  export const handleGetListingById = async (req, res) => {
    try {
      const listing = await getListingById(req.params.id);
      if (!listing) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, listing });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  
  export const handleSearchListings = async (req, res) => {
    try {
      const results = await searchListings(req.query);
      res.json({ success: true, results });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  
  export const handleIncrementViews = async (req, res) => {
    try {
      await incrementViews(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  
  export const handleMarkAsPurchased = async (req, res) => {
    try {
      await markAsPurchased(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  
  export const handlePublishStatus = async (req, res) => {
    try {
      const listing = await setPublishStatus(req.params.id, req.body.isPublished);
      res.json({ success: true, listing });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  
  export const handleDeleteListing = async (req, res) => {
    try {
      await deleteListingPermanently(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  
  export const handleBulkUpdate = async (req, res) => {
    try {
      const result = await bulkUpdateListings(req.body.action, req.body.listingIds);
      res.json({ success: true, result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  };
  
  export const handleModerationFlag = async (req, res) => {
    try {
      const listing = await flagListingAsModerationNeeded(req.params.id, req.body.reason);
      res.json({ success: true, listing });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  
  export const handleListingStats = async (req, res) => {
    try {
      const stats = await getListingStats({ filters: req.query });
      res.json({ success: true, stats });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  
  export const handleCSVSync = async (req, res) => {
    try {
      const results = await bulkSyncFromCSV(req.body.rows, req.body.syncBatchId);
      res.json({ success: true, results });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  