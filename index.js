const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const compression = require('compression');
const nodemailer = require('nodemailer');

const config = require('./config');
const Comic = require('./models/comic');
const Record = require('./models/record');
const Stock = require('./models/stock');
const Company2 = require('./models/company');
const Character = require('./models/character');
const Cart = require('./models/cart');
const CartItem = require('./models/cartItem');
const Order = require('./models/order');
const OrderItem = require('./models/orderItem');

const app = express();

/* ----------------------------- Email transport ------------------------------ */

const useSendmail = process.env.EMAIL_TRANSPORT === 'sendmail';

const transporter = nodemailer.createTransport(
  useSendmail
    ? {
        sendmail: true,
        newline: 'unix',
        path: '/usr/sbin/sendmail'
      }
    : {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465, // 465 = SSL, 587 = STARTTLS
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 15000,
        greetingTimeout: 10000
      }
);

// Helper to email order details (does NOT break the API if it fails)
async function sendOrderEmail(order, lineItems) {
  try {
    if (!order) {
      console.warn('sendOrderEmail: no order object, skipping');
      return;
    }

    const to = process.env.ORDER_NOTIFY_TO || process.env.SMTP_FROM || process.env.EMAIL_FROM;
    if (!to) {
      console.warn('sendOrderEmail: no ORDER_NOTIFY_TO / SMTP_FROM / EMAIL_FROM set; skipping email.');
      return;
    }

    const subject = `New iSellComics Order #${order.id} - ${order.name}`;

    const lines = lineItems.map(li =>
      `- ${li.title} #${li.issue || ''} x${li.qty} @ ${li.unit_price.toFixed(2)} ${order.currency} = ${li.line_total.toFixed(2)}`
    );

    const textBody = [
      `New order received from ${order.name}`,
      '',
      `Order ID: ${order.id}`,
      `Email: ${order.email}`,
      `Address: ${order.address}`,
      '',
      `Payment Method: ${order.paymentMethod}`,
      `Pickup: ${order.pickup ? 'Yes' : 'No'}`,
      '',
      'Items:',
      ...lines,
      '',
      `Subtotal: ${order.subtotal.toFixed(2)} ${order.currency}`,
      `Shipping: ${order.shipping.toFixed(2)} ${order.currency}`,
      `Total: ${order.total.toFixed(2)} ${order.currency}`,
      '',
      'You can view this order in the database (orders / order_items tables).'
    ].join('\n');

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.EMAIL_FROM || to,
      to,
      subject,
      text: textBody
    });

    console.log('sendOrderEmail: email sent. MessageId:', info.messageId);
  } catch (err) {
    console.error('sendOrderEmail: error while sending email:', err);
    // DO NOT rethrow – checkout should still succeed
  }
}

/* ----------------------------- CORS (allow-list) ---------------------------- */

const allowedOrigins = [
  'https://isellcomics.ca',
  'https://www.isellcomics.ca',
  'https://back.isellcomics.ca',
  'http://localhost:4200',
  'https://practise.funkyrobot.ca'
];

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true); // allow curl/Postman
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.log('Blocked CORS for origin:', origin);
    return callback(new Error('CORS not allowed'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Session-Id'],
  credentials: true
}));

/* ------------------------------ Global middleware --------------------------- */

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Compression before routes & static
app.use(compression());

// Serve images & static files at /public
app.use('/public', express.static(path.join(__dirname, 'public'), {
  maxAge: '30d',
  etag: true,
  immutable: true
}));

/* --------------------------------- Health/Test ------------------------------ */

app.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.get('/booster', (_req, res) => res.send('Hello Booster Gold'));

app.get('/test-uuid', (_req, res) => res.send(uuidv4()));

app.get('/test-email', async (_req, res) => {
  try {
    console.log('Hit /test-email endpoint');

    console.log('SMTP_HOST =', process.env.SMTP_HOST);
    console.log('SMTP_PORT =', process.env.SMTP_PORT);
    console.log('SMTP_USER =', process.env.SMTP_USER);
    console.log('SMTP_FROM =', process.env.SMTP_FROM);
    console.log('ORDER_NOTIFY_TO =', process.env.ORDER_NOTIFY_TO);

    const to = process.env.ORDER_NOTIFY_TO || process.env.SMTP_FROM || process.env.EMAIL_FROM;
    if (!to) {
      return res.status(500).json({ error: 'No ORDER_NOTIFY_TO / SMTP_FROM / EMAIL_FROM configured' });
    }

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.EMAIL_FROM || to,
      to,
      subject: 'Test email from iSellComics backend',
      text: 'If you are reading this, SMTP is working for back.isellcomics.ca.'
    });

    console.log('Test email sent, messageId:', info.messageId);
    res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error('Error in /test-email:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------ DB / Sequelize ------------------------------ */

/* ------------------------------ Sequelize Setup ----------------------------- */
config.authenticate()
  .then(() => {
    console.log('Database is connected.');
  })
  .catch(err => {
    console.error('DB connection error:', err);
  });


/* ------------------------------ Associations -------------------------------- */

// Cart ↔ CartItem ↔ Comic
Cart.hasMany(CartItem, { foreignKey: 'cart_id', as: 'items' });
CartItem.belongsTo(Cart, { foreignKey: 'cart_id' });
CartItem.belongsTo(Comic, { foreignKey: 'comic_id', as: 'comic' });

// Order ↔ OrderItem ↔ Comic
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
OrderItem.belongsTo(Comic, { foreignKey: 'comic_id', as: 'comic' });

/* --------------------------------- Multer ----------------------------------- */

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    let destination = path.join(__dirname, 'public/other/');
    const route = req.path || '';

    if (route.includes('addcomics') || route.includes('comics')) {
      const publisher = (req.body?.publisher || '').toString().toLowerCase().trim();
      if (publisher.includes('dc')) destination = path.join(__dirname, 'public/dc/');
      else if (publisher.includes('marvel')) destination = path.join(__dirname, 'public/marvel/');
      else if (publisher.includes('image')) destination = path.join(__dirname, 'public/image/');
      else if (publisher.includes('dark horse') || publisher.includes('darkhorse')) destination = path.join(__dirname, 'public/darkhorse/');
      else destination = path.join(__dirname, 'public/other/');
    } else if (route.includes('character')) {
      destination = path.join(__dirname, 'public/characters/');
    } else if (route.includes('company')) {
      destination = path.join(__dirname, 'public/companies/');
    }

    fs.mkdirSync(destination, { recursive: true });
    cb(null, destination);
  },
  filename: (_req, file, cb) => cb(null, file.originalname)
});

const upload = multer({ storage });

/* --------------------------------- Comics ----------------------------------- */

// All comics
app.get('/comics', async (_req, res) => {
  try {
    const rows = await Comic.findAll();
    res.status(200).json(rows);
  } catch (err) {
    console.error('GET /comics error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Single comic by ID
app.get('/comic/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await Comic.findByPk(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(row);
  } catch (err) {
    console.error('GET /comic/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Comics by publisher
app.get('/comics/publisher/:name', async (req, res) => {
  try {
    const name = req.params.name;
    const rows = await Comic.findAll({ where: { publisher: name } });
    res.status(200).json(rows);
  } catch (err) {
    console.error('GET /comics/publisher/:name error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Recently updated comics
app.get('/comics/recent-updated', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), 50);
    const rows = await Comic.findAll({
      order: [['updatedAt', 'DESC']],
      limit,
      attributes: ['id', 'title', 'issue', 'publisher', 'image', 'value', 'updatedAt']
    });
    res.status(200).json(rows);
  } catch (err) {
    console.error('GET /comics/recent-updated error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create comic
app.post('/addcomics', upload.single('image'), async (req, res) => {
  try {
    const new_comic = {
      title: req.body.title,
      issue: req.body.issue,
      type: req.body.type,
      year: req.body.year,
      publisher: req.body.publisher,
      condition: req.body.condition,
      grade: req.body.grade,
      key: req.body.key,
      description: req.body.description,
      short: req.body.short,
      characters: req.body.characters,
      writer: req.body.writer,
      artist: req.body.artist,
      image: req.file?.originalname || null,
      value: req.body.value,
      slabbed: req.body.slabbed,
      isbn: req.body.isbn,
      qty: req.body.qty,
      volume: req.body.volume
    };

    const result = await Comic.create(new_comic);
    res.status(200).json({ message: 'Upload successful', comic: result, image: new_comic.image });
  } catch (err) {
    console.error('POST /addcomics error:', err);
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
});

// Update comic (no new image)
app.patch('/comics/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid comic ID' });

    const comic = await Comic.findByPk(id);
    if (!comic) return res.status(404).json({ error: 'Comic not found' });

    const updatableFields = [
      'title','issue','type','year','publisher','condition','grade','key',
      'description','short','characters','writer','artist','value','slabbed','isbn','qty','volume'
    ];

    let changed = false;
    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        comic[field] = req.body[field];
        changed = true;
      }
    }

    if (!changed) return res.status(400).json({ error: 'No valid fields to update' });

    await comic.save();
    res.status(200).json(comic);
  } catch (err) {
    console.error('PATCH /comics/:id error:', err);
    res.status(500).json({ error: 'Server error updating comic' });
  }
});

// Update comic + image
app.patch('/comics/:id/image', upload.single('image'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid comic ID' });

    const comic = await Comic.findByPk(id);
    if (!comic) return res.status(404).json({ error: 'Comic not found' });

    const updatableFields = [
      'title','issue','type','year','publisher','condition','grade','key',
      'description','short','characters','writer','artist','value','slabbed','isbn','qty','volume'
    ];
    for (const field of updatableFields) {
      if (req.body[field] !== undefined) comic[field] = req.body[field];
    }

    if (req.file) comic.image = req.file.originalname;

    await comic.save();
    res.status(200).json(comic);
  } catch (err) {
    console.error('PATCH /comics/:id/image error:', err);
    res.status(500).json({ error: 'Server error updating comic' });
  }
});

/* -------------------------------- Companies --------------------------------- */

app.get('/company', async (_req, res) => {
  try {
    const rows = await Company2.findAll();
    res.status(200).json(rows);
  } catch (err) {
    console.error('GET /company error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/addcompany', upload.single('image'), async (req, res) => {
  try {
    const new_company = {
      name: req.body.name,
      image: req.file?.originalname || null,
      createdAt: req.body.createdAt,
      updatedAt: req.body.updatedAt
    };
    const result = await Company2.create(new_company);
    res.status(200).json({ message: 'Upload successful', company: result, image: new_company.image });
  } catch (err) {
    console.error('POST /addcompany error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------- Characters -------------------------------- */

app.get('/character', async (_req, res) => {
  try {
    const rows = await Character.findAll();
    res.status(200).json(rows);
  } catch (err) {
    console.error('GET /character error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/character/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid character ID' });
    const row = await Character.findByPk(id);
    if (!row) return res.status(404).json({ error: 'Character not found' });
    res.status(200).json(row);
  } catch (err) {
    console.error('GET /character/:id error:', err);
    res.status(500).json({ error: 'Server error fetching character' });
  }
});

app.post('/addcharacter', upload.single('image'), async (req, res) => {
  try {
    const new_character = {
      name: req.body.name,
      image: req.file?.originalname || null,
      createdAt: req.body.createdAt,
      updatedAt: req.body.updatedAt
    };
    const result = await Character.create(new_character);
    res.status(200).json({ message: 'Upload successful', character: result, image: new_character.image });
  } catch (err) {
    console.error('POST /addcharacter error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/updatecharacter', upload.single('image'), async (req, res) => {
  try {
    const { id, name } = req.body;
    if (!id) return res.status(400).json({ error: 'Character ID is required' });

    const characterId = parseInt(id, 10);
    if (isNaN(characterId)) return res.status(400).json({ error: 'Invalid character ID' });

    const character = await Character.findByPk(characterId);
    if (!character) return res.status(404).json({ error: 'Character not found' });

    if (name) character.name = name;
    if (req.file) character.imageName = req.file.originalname;

    await character.save();
    res.status(200).json({
      message: 'Character updated successfully',
      character: { id: character.id, name: character.name, imageName: character.imageName }
    });
  } catch (err) {
    console.error('PUT /updatecharacter error:', err);
    res.status(500).json({ error: 'Server error updating character' });
  }
});

/* ---------------------------------- Records --------------------------------- */

app.get('/records', async (_req, res) => {
  try {
    const rows = await Record.findAll();
    res.status(200).json(rows);
  } catch (err) {
    console.error('GET /records error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/addrecord', async (req, res) => {
  try {
    const new_record = {
      artist: req.body.artist,
      title: req.body.title,
      year: req.body.year,
      type: req.body.type
    };
    const result = await Record.create(new_record);
    res.status(200).json(result);
  } catch (err) {
    console.error('POST /addrecord error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------ Stock --------------------------------- */

app.get('/stock', async (_req, res) => {
  try {
    const rows = await Stock.findAll();
    res.status(200).json(rows);
  } catch (err) {
    console.error('GET /stock error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/addstock', async (req, res) => {
  try {
    const new_stock = {
      symbol: req.body.symbol,
      name: req.body.name,
      date_purchased: req.body.date_purchased,
      price_bought_CAD: req.body.price_bought_CAD,
      price_sold_CAD: req.body.price_sold_CAD,
      price_bought_US: req.body.price_bought_US,
      price_sold_US: req.body.price_sold_US,
      date_sold: req.body.date_sold,
      CAN_US_Rate_bought: req.body.CAN_US_Rate_bought,
      US_CAN_Rate_bought: req.body.US_CAN_Rate_bought,
      CAN_US_Rate_sold: req.body.CAN_US_Rate_sold,
      US_CAN_Rate_sold: req.body.US_CAN_Rate_sold,
      amount: req.body.amount,
      notes: req.body.notes,
      active: req.body.active,
      today: req.body.today
    };
    const result = await Stock.create(new_stock);
    res.status(200).json(result);
  } catch (err) {
    console.error('POST /addstock error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/stock/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { today } = req.body;
    const updatedStock = await Stock.update({ today }, { where: { id } });
    res.json(updatedStock);
  } catch (error) {
    console.error('PATCH /stock/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

/* ------------------------------------ Cart ---------------------------------- */

// Get cart
app.get('/api/cart', async (req, res) => {
  try {
    const sessionId = req.headers['session-id'];
    const cart = await Cart.findOne({
      where: { session_id: sessionId },
      include: [{
        model: CartItem,
        as: 'items',
        include: [{ model: Comic, as: 'comic' }]
      }]
    });

    if (!cart) return res.json({ sessionId, items: [] });

    const items = cart.items
      .map(item => ({
        cartItemId: item.id,
        quantity: item.quantity,
        comic: item.comic ? {
          id: item.comic.id,
          title: item.comic.title,
          issue: item.comic.issue,
          value: item.comic.value,
          image: item.comic.image,
          publisher: item.comic.publisher
        } : null
      }))
      .filter(i => i.comic);

    res.json({ sessionId, items });
  } catch (err) {
    console.error('GET /api/cart error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add item to cart
app.post('/api/cart/items', async (req, res) => {
  const { sessionId, comicId } = req.body;
  const quantity = 1;

  try {
    const [cart] = await Cart.findOrCreate({
      where: { session_id: sessionId },
      defaults: { session_id: sessionId }
    });

    const [item, created] = await CartItem.findOrCreate({
      where: { cart_id: cart.id, comic_id: comicId },
      defaults: { quantity: 1 }
    });

    if (!created) {
      item.quantity += quantity;
      await item.save();
    }

    res.json(item);
  } catch (err) {
    console.error('POST /api/cart/items error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Remove a single comic from cart
app.delete('/api/cart/items/:comicId', async (req, res) => {
  try {
    const { comicId } = req.params;
    const sessionId = req.headers['session-id'];

    const cart = await Cart.findOne({ where: { session_id: sessionId } });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    await CartItem.destroy({ where: { cart_id: cart.id, comic_id: comicId } });
    res.status(200).json({ message: 'Item removed' });
  } catch (err) {
    console.error('DELETE /api/cart/items/:comicId error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update quantity for a cart item
app.patch('/api/cart/items/:comicId', async (req, res) => {
  try {
    const { comicId } = req.params;
    const { quantity } = req.body;
    const sessionId = req.headers['session-id'];

    const cart = await Cart.findOne({ where: { session_id: sessionId } });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    const item = await CartItem.findOne({ where: { cart_id: cart.id, comic_id: comicId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    item.quantity = quantity;
    await item.save();
    res.status(200).json(item);
  } catch (err) {
    console.error('PATCH /api/cart/items/:comicId error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Clear entire cart
app.delete('/api/cart', async (req, res) => {
  try {
    const sessionId = req.headers['session-id'];
    if (!sessionId) return res.status(400).json({ error: 'Session ID required' });

    const cart = await Cart.findOne({ where: { session_id: sessionId } });
    if (cart) {
      await CartItem.destroy({ where: { cart_id: cart.id } });
      await cart.destroy();
    }

    res.status(200).json({ message: 'Cart cleared' });
  } catch (err) {
    console.error('DELETE /api/cart error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* --------------------------------- Checkout --------------------------------- */

app.post('/api/checkout', async (req, res) => {
  try {
    const { sessionId, customer } = req.body || {};
    console.log('Checkout request body:', JSON.stringify(req.body, null, 2));

    if (!sessionId) {
      console.warn('Checkout error: missing sessionId');
      return res.status(400).json({ error: 'sessionId is required' });
    }

    if (!customer || !customer.name || !customer.email || !customer.address || !customer.paymentMethod) {
      console.warn('Checkout error: incomplete customer info', customer);
      return res.status(400).json({ error: 'Incomplete customer info' });
    }

    const cart = await Cart.findOne({
      where: { session_id: sessionId },
      include: [{
        model: CartItem,
        as: 'items',
        include: [{ model: Comic, as: 'comic' }]
      }]
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      console.warn('Checkout error: cart empty for session', sessionId);
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const lineItems = cart.items
      .filter(it => it.comic)
      .map(it => {
        const price = Number(it.comic.value || 0);
        const qty = Number(it.quantity || 1);
        return {
          comic_id: it.comic.id,
          title: it.comic.title,
          issue: it.comic.issue,
          qty,
          unit_price: price,
          line_total: price * qty,
          image: it.comic.image
        };
      });

    if (lineItems.length === 0) {
      console.warn('Checkout error: no valid items with comics for session', sessionId);
      return res.status(400).json({ error: 'No valid items in cart' });
    }

    const subtotal = lineItems.reduce((sum, li) => sum + li.line_total, 0);
    const shipping = 0;
    const total = subtotal + shipping;

    const order = await Order.create({
      session_id: sessionId,
      name: customer.name,
      email: customer.email,
      address: customer.address,
      paymentMethod: customer.paymentMethod,
      pickup: !!customer.pickup,
      subtotal,
      shipping,
      total,
      currency: 'CAD',
      status: 'pending'
    });

    for (const li of lineItems) {
      await OrderItem.create({
        order_id: order.id,
        comic_id: li.comic_id,
        title: li.title,
        issue: li.issue,
        qty: li.qty,
        unit_price: li.unit_price,
        line_total: li.line_total,
        image: li.image
      });
    }

    await CartItem.destroy({ where: { cart_id: cart.id } });
    await cart.destroy();

    // fire-and-forget email
    sendOrderEmail(order, lineItems).catch(err => {
      console.error('Checkout: email failed but order is saved:', err);
    });

    res.status(200).json({
      message: 'Order received!',
      orderId: order.id,
      total: order.total,
      paymentMethod: order.paymentMethod,
      pickup: order.pickup
    });
  } catch (err) {
    console.error('Checkout error (server):', err);
    res.status(500).json({ error: 'Checkout failed', details: err.message });
  }
});

/* ---------------------------------- Startup --------------------------------- */

const port = process.env.PORT || 3003;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);

  console.log('\nRegistered Routes:');
  app._router.stack.forEach((mw) => {
    if (mw.route) {
      console.log(`${Object.keys(mw.route.methods).join(', ').toUpperCase()} ${mw.route.path}`);
    }
  });
});
