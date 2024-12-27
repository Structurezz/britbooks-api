import Stock from '../models/Stock.js';
import User from '../models/User.js';

// Admin creates or updates a stock
export const createOrUpdateStock = async (req, res) => {
  const { symbol, name, category, price, quantityAvailable } = req.body;

  try {
    let stock = await Stock.findOne({ symbol });

    // If the stock already exists, update it
    if (stock) {
      stock.name = name || stock.name;
      stock.category = category || stock.category;
      stock.price = price || stock.price;
      stock.quantityAvailable = quantityAvailable || stock.quantityAvailable;
      stock.updatedAt = Date.now();
      
      await stock.save();
      return res.status(200).json({ message: 'Stock updated successfully', stock });
    }

    // If stock does not exist, create a new one
    stock = new Stock({
      symbol,
      name,
      category,
      price,
      quantityAvailable
    });

    await stock.save();
    res.status(201).json({ message: 'Stock created successfully', stock });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while creating or updating the stock' });
  }
};

// Get all stocks (public)
export const getAllStocks = async (req, res) => {
  try {
    const stocks = await Stock.find();
    if (stocks.length === 0) {
      return res.status(404).json({ message: 'No stocks found' });
    }
    res.status(200).json({ stocks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching stocks' });
  }
};

// Get a specific stock by symbol (public)
export const getStockBySymbol = async (req, res) => {
  const { symbol } = req.params;

  try {
    const stock = await Stock.findOne({ symbol });
    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }

    res.status(200).json({ stock });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching stock details' });
  }
};

// Admin deletes a stock
export const deleteStock = async (req, res) => {
  const { symbol } = req.params;

  try {
    const stock = await Stock.findOne({ symbol });
    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }

    await stock.remove();
    res.status(200).json({ message: 'Stock deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting stock' });
  }
};

// User buys stock
export const buyStock = async (req, res) => {
  const { userId } = req.params;
  const { symbol, quantity } = req.body;

  try {
    const stock = await Stock.findOne({ symbol });
    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }

    if (stock.quantityAvailable < quantity) {
      return res.status(400).json({ message: 'Not enough stock available' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Reduce the stock quantity
    stock.quantityAvailable -= quantity;
    await stock.save();

    // You would add a transaction here (e.g., record the user's purchase)

    res.status(200).json({ message: 'Stock purchased successfully', stock });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error purchasing stock' });
  }
};

// User sells stock
export const sellStock = async (req, res) => {
  const { userId } = req.params;
  const { symbol, quantity } = req.body;

  try {
    const stock = await Stock.findOne({ symbol });
    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }

    // Increase the stock quantity available
    stock.quantityAvailable += quantity;
    await stock.save();

    // You would add a transaction here (e.g., record the user's sale)

    res.status(200).json({ message: 'Stock sold successfully', stock });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error selling stock' });
  }
};
