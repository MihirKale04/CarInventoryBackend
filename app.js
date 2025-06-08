// app.js

require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const sql = require('mssql'); // SQL Server driver
const app = express();

const port = process.env.PORT || 3000; // API will run on port 3000 (or specified in .env)

// Middleware to parse JSON request bodies
app.use(express.json());

// --- SQL Server Configuration ---
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER, // You may need to use your actual IP address here if localhost doesn't work from another machine/simulator
    database: process.env.DB_DATABASE,
    options: {
        encrypt: false, // Use true for Azure SQL Database or if your SQL Server requires SSL
        trustServerCertificate: true // Change to false for production environments if you have a valid certificate
    }
};


// --- Database Connection Pool ---
// Create a global connection pool for better performance and resource management
let pool;
async function connectToDatabase() {
    try {
        pool = new sql.ConnectionPool(dbConfig);
        await pool.connect();
        console.log('Connected to SQL Server database.');
    } catch (err) {
        console.error('Database connection failed:', err);
        process.exit(1); // Exit if cannot connect to DB
    }
}


// --- Helper Functions for Database Operations ---
// Get or Create Car Model ID
async function getOrCreateCarModelId(makeName, modelName) {
    try {
        const selectRequest = pool.request();
        let result = await selectRequest
            .input('makeName', sql.VarChar(255), makeName)
            .input('modelName', sql.VarChar(255), modelName)
            .query`SELECT model_id FROM CarModels WHERE make = ${makeName} AND model_name = ${modelName}`;

        if (result.recordset.length > 0) {
            return result.recordset[0].model_id;
        } else {
            // Insert new model and get its ID
            const insertRequest = pool.request();
            result = await insertRequest
                .input('makeName', sql.VarChar(255), makeName)
                .input('modelName', sql.VarChar(255), modelName)
                .query`INSERT INTO CarModels (make, model_name) VALUES (${makeName}, ${modelName}); SELECT SCOPE_IDENTITY() AS model_id;`;
            return result.recordset[0].model_id;
        }
    } catch (err) {
        throw new Error(`Failed to get or create model ID for Make: ${makeName}, Model: ${modelName} ${err.message}`);
    }
}



// --- API Endpoints ---
// GET /list - Get all cars
app.get('/cars', async (req, res) => {
    try {
        const request = pool.request();
        const result = await request.query(`
            SELECT
                CarInventory.car_id,
                CarModels.make,
                CarModels.model_name, 
                CarInventory.year,
                CarInventory.price
            FROM CarInventory INNER JOIN CarModels ON CarInventory.model_id = CarModels.model_id
        `);
        res.json(result.recordset); // Send results as JSON
    } catch (err) {
        console.error('Error fetching cars:', err);
        res.status(500).json({ error: 'Failed to fetch cars', details: err.message });
    }
});


// POST /cars - Add a new car
app.post('/cars', async (req, res) => {
    const { make, model_name, year, price } = req.body;

    // Basic validation
    if (!make || !model_name || !year || !price) {
        return res.status(400).json({ error: 'make, model_name, year, and price are required.'  });
    }
    if (isNaN(year) || isNaN(price)) {
        return res.status(400).json({ error: 'Year and price must be numbers.' });
    }
    try {
        const modelId = await getOrCreateCarModelId(make, model_name);
        const request = pool.request();
        const result = await request
            .input('modelId', sql.Int, modelId)
            .input('year', sql.Int, year)
            .input('price', sql.Int, price)
            .query`INSERT INTO CarInventory (model_id, year, price) VALUES (${modelId}, ${year}, ${price}); SELECT SCOPE_IDENTITY() AS car_id;`;

        const newCarId = result.recordset[0].car_id;
        res.status(201).json({ id: newCarId, make, model_name, year, price }); // 201 Created
    } catch (err) {
        console.error('Error adding car:', err);
        res.status(500).json({ error: 'Failed to add car', details: err.message });
    }
});


// DELETE /cars/all - Delete all cars in DB
app.delete('/cars/all', async (req, res) => {
    try {
        const request = pool.request(); 
        await request.query`TRUNCATE TABLE CarInventory;`
        res.status(204).send(); // 204 No Content for successful deletion
    } catch (err) {
        console.error('Error processing DELETE /cars/all:', err);
        res.status(500).json({ error: 'Failed to delete all cars', details: err.message });
    }
});



// DELETE /cars/:id - Delete car by ID
app.delete('/cars/:id', async (req, res) => {
    const carId = parseInt(req.params.id);
    if (isNaN(carId)) {
        return res.status(400).json({ error: 'Invalid car ID provided.' });
    }

    try {
        const request = pool.request();
        const result = await request
            .input('carId', sql.Int, carId)
            .query`DELETE FROM CarInventory WHERE car_id = ${carId}`;

        if (result.rowsAffected[0] > 0) {
            res.status(204).send(); // 204 No Content
        } else {
            res.status(404).json({ message: `Car with ID ${carId} not found.` });
        }
    } catch (err) {
        console.error(`Error deleting car with ID ${carId}:`, err);
        res.status(500).json({ error: 'Failed to delete car', details: err.message });
    }
});




// --- Start the server ---
async function startServer() {
    await connectToDatabase();
    app.listen(port, () => {
        console.log(`Node.js/Express backend listening on port ${port}`);
        console.log(`Access at http://localhost:${port}`);
    });
}

startServer();