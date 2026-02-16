const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET all expenses with filters
const getAllExpenses = async (req, res) => {
  try {
    const { type, horseId, employeeId, startDate, endDate, page = 1, limit = 10 } = req.query;
    
    let where = {};
    
    if (type) where.type = type;
    if (horseId) where.horseId = horseId;
    if (employeeId) where.employeeId = employeeId;
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const expenses = await prisma.expense.findMany({
      where,
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
        horse: { select: { id: true, name: true } },
        employee: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    });
    
    const total = await prisma.expense.count({ where });
    
    res.json({
      expenses,
      total,
      pages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET single expense
const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
        horse: { select: { id: true, name: true } },
        employee: { select: { id: true, fullName: true, email: true } },
      },
    });
    
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CREATE expense
const createExpense = async (req, res) => {
  try {
    const { type, amount, description, date, horseId, employeeId, attachments } = req.body;
    const userId = req.user?.id;
    
    // Validate required fields
    if (!type || !amount || !description || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Ensure only one of horseId or employeeId is provided
    if (!horseId && !employeeId) {
      return res.status(400).json({ error: 'Either horseId or employeeId must be provided' });
    }
    
    if (horseId && employeeId) {
      return res.status(400).json({ error: 'Expense can be assigned to either a horse or employee, not both' });
    }
    
    // Validate amount
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    
    // Validate expense type
    const validTypes = ['Medicine', 'Treatment', 'Maintenance', 'Miscellaneous'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid expense type. Must be one of: ${validTypes.join(', ')}` });
    }
    
    const expense = await prisma.expense.create({
      data: {
        type,
        amount: parsedAmount,
        description,
        date: new Date(date),
        createdById: userId,
        horseId: horseId || null,
        employeeId: employeeId || null,
        attachments: attachments ? JSON.stringify(attachments) : null,
      },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
        horse: { select: { id: true, name: true } },
        employee: { select: { id: true, fullName: true, email: true } },
      },
    });
    
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE expense
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, description, date, horseId, employeeId, attachments } = req.body;
    
    // Check if expense exists
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    // Validate if both horseId and employeeId are provided
    const updatedHorseId = horseId !== undefined ? horseId : expense.horseId;
    const updatedEmployeeId = employeeId !== undefined ? employeeId : expense.employeeId;
    
    if (updatedHorseId && updatedEmployeeId) {
      return res.status(400).json({ error: 'Expense can be assigned to either a horse or employee, not both' });
    }
    
    const updateData = {};
    if (type) updateData.type = type;
    if (amount) updateData.amount = Number(amount);
    if (description) updateData.description = description;
    if (date) updateData.date = new Date(date);
    if (horseId !== undefined) updateData.horseId = horseId;
    if (employeeId !== undefined) updateData.employeeId = employeeId;
    if (attachments) updateData.attachments = JSON.stringify(attachments);
    
    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
        horse: { select: { id: true, name: true } },
        employee: { select: { id: true, fullName: true, email: true } },
      },
    });
    
    res.json(updatedExpense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE expense
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    await prisma.expense.delete({ where: { id } });
    
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
};
