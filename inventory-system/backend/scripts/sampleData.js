const database = require('../config/database');
const { logStockMovement } = require('../middleware/logger');

async function insertSampleData() {
    console.log('Inserting sample data...');

    try {
        // Sample products
        const sampleProducts = [
            {
                name: 'Laptop - Dell XPS 13',
                description: 'High-performance ultrabook with Intel Core i7',
                sku: 'DELL-XPS13-001',
                category: 'Electronics',
                unit_price: 1299.99,
                min_stock_level: 5,
                max_stock_level: 50,
                current_stock: 25,
                location: 'Warehouse A - Electronics',
                supplier: 'Dell Technologies'
            },
            {
                name: 'Office Chair - Ergonomic',
                description: 'Adjustable height office chair with lumbar support',
                sku: 'CHAIR-ERG-001',
                category: 'Furniture',
                unit_price: 299.99,
                min_stock_level: 3,
                max_stock_level: 30,
                current_stock: 12,
                location: 'Warehouse B - Furniture',
                supplier: 'Office Solutions Inc'
            },
            {
                name: 'Wireless Mouse',
                description: 'Bluetooth wireless mouse with optical sensor',
                sku: 'MOUSE-WRL-001',
                category: 'Electronics',
                unit_price: 29.99,
                min_stock_level: 10,
                max_stock_level: 100,
                current_stock: 45,
                location: 'Warehouse A - Electronics',
                supplier: 'Tech Accessories Ltd'
            },
            {
                name: 'Notebook - Spiral A4',
                description: '200-page spiral notebook, ruled',
                sku: 'NOTE-A4-001',
                category: 'Office Supplies',
                unit_price: 3.99,
                min_stock_level: 20,
                max_stock_level: 500,
                current_stock: 150,
                location: 'Warehouse C - Supplies',
                supplier: 'Paper Products Co'
            },
            {
                name: 'Monitor - 24" LED',
                description: '24-inch LED monitor, 1920x1080 resolution',
                sku: 'MON-24LED-001',
                category: 'Electronics',
                unit_price: 189.99,
                min_stock_level: 8,
                max_stock_level: 40,
                current_stock: 18,
                location: 'Warehouse A - Electronics',
                supplier: 'Display Tech Inc'
            },
            {
                name: 'Desk Lamp - LED',
                description: 'Adjustable LED desk lamp with USB charging',
                sku: 'LAMP-LED-001',
                category: 'Furniture',
                unit_price: 45.99,
                min_stock_level: 5,
                max_stock_level: 25,
                current_stock: 8,
                location: 'Warehouse B - Furniture',
                supplier: 'Lighting Solutions'
            },
            {
                name: 'Printer Paper - A4',
                description: 'A4 white printer paper, 500 sheets per pack',
                sku: 'PAPER-A4-001',
                category: 'Office Supplies',
                unit_price: 8.99,
                min_stock_level: 15,
                max_stock_level: 200,
                current_stock: 75,
                location: 'Warehouse C - Supplies',
                supplier: 'Paper Products Co'
            },
            {
                name: 'USB Cable - Type-C',
                description: 'USB-C to USB-A cable, 6 feet length',
                sku: 'USB-TYPEC-001',
                category: 'Electronics',
                unit_price: 12.99,
                min_stock_level: 25,
                max_stock_level: 150,
                current_stock: 60,
                location: 'Warehouse A - Electronics',
                supplier: 'Tech Accessories Ltd'
            },
            {
                name: 'Whiteboard Markers',
                description: 'Set of 4 dry erase markers, assorted colors',
                sku: 'MARKER-WB-001',
                category: 'Office Supplies',
                unit_price: 6.99,
                min_stock_level: 12,
                max_stock_level: 80,
                current_stock: 35,
                location: 'Warehouse C - Supplies',
                supplier: 'Writing Instruments Inc'
            },
            {
                name: 'Standing Desk Converter',
                description: 'Adjustable standing desk converter for existing desks',
                sku: 'DESK-STAND-001',
                category: 'Furniture',
                unit_price: 179.99,
                min_stock_level: 2,
                max_stock_level: 15,
                current_stock: 6,
                location: 'Warehouse B - Furniture',
                supplier: 'Ergonomic Solutions'
            }
        ];

        // Insert products
        const productIds = [];
        for (const product of sampleProducts) {
            const result = await database.run(
                `INSERT INTO products 
                 (name, description, sku, category, unit_price, min_stock_level, max_stock_level, current_stock, location, supplier)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    product.name,
                    product.description,
                    product.sku,
                    product.category,
                    product.unit_price,
                    product.min_stock_level,
                    product.max_stock_level,
                    product.current_stock,
                    product.location,
                    product.supplier
                ]
            );
            productIds.push(result.id);

            // Log initial stock movement
            if (product.current_stock > 0) {
                await logStockMovement(
                    result.id,
                    'IN',
                    product.current_stock,
                    0,
                    product.current_stock,
                    product.unit_price,
                    product.unit_price * product.current_stock,
                    'INITIAL_STOCK',
                    'Initial stock setup for sample data',
                    1 // admin user
                );
            }
        }

        // Generate some sample stock movements for the past month
        const movementTypes = ['IN', 'OUT', 'ADJUSTMENT'];
        const today = new Date();
        
        for (let i = 0; i < 50; i++) {
            const randomProductId = productIds[Math.floor(Math.random() * productIds.length)];
            const movementType = movementTypes[Math.floor(Math.random() * movementTypes.length)];
            const quantity = Math.floor(Math.random() * 20) + 1;
            
            // Get current stock
            const product = await database.get('SELECT * FROM products WHERE id = ?', [randomProductId]);
            const previousStock = product.current_stock;
            
            let newStock;
            if (movementType === 'IN') {
                newStock = previousStock + quantity;
            } else if (movementType === 'OUT' && previousStock >= quantity) {
                newStock = previousStock - quantity;
            } else if (movementType === 'ADJUSTMENT') {
                newStock = Math.max(0, previousStock + (Math.random() > 0.5 ? quantity : -quantity));
            } else {
                continue; // Skip invalid movements
            }

            // Don't exceed max stock level
            if (newStock > product.max_stock_level) {
                newStock = product.max_stock_level;
            }

            if (newStock !== previousStock) {
                // Update product stock
                await database.run(
                    'UPDATE products SET current_stock = ? WHERE id = ?',
                    [newStock, randomProductId]
                );

                // Create stock movement with random date in the past month
                const randomDate = new Date(today.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
                
                await database.run(
                    `INSERT INTO stock_movements 
                     (product_id, movement_type, quantity, previous_stock, new_stock, unit_cost, total_cost, reference_number, notes, user_id, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        randomProductId,
                        movementType,
                        Math.abs(newStock - previousStock),
                        previousStock,
                        newStock,
                        product.unit_price,
                        product.unit_price * Math.abs(newStock - previousStock),
                        `${movementType}-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
                        `Sample ${movementType.toLowerCase()} movement`,
                        1, // admin user
                        randomDate.toISOString()
                    ]
                );
            }
        }

        // Add some additional suppliers
        const additionalSuppliers = [
            { name: 'Global Tech Supplies', contact_person: 'John Smith', email: 'john@globaltech.com', phone: '555-0101' },
            { name: 'Office Equipment Pro', contact_person: 'Sarah Johnson', email: 'sarah@officeequipment.com', phone: '555-0102' },
            { name: 'Furniture Warehouse', contact_person: 'Mike Brown', email: 'mike@furniturewarehouse.com', phone: '555-0103' }
        ];

        for (const supplier of additionalSuppliers) {
            await database.run(
                'INSERT OR IGNORE INTO suppliers (name, contact_person, email, phone) VALUES (?, ?, ?, ?)',
                [supplier.name, supplier.contact_person, supplier.email, supplier.phone]
            );
        }

        console.log('Sample data inserted successfully!');
        console.log(`- ${sampleProducts.length} products added`);
        console.log('- Stock movements generated for the past month');
        console.log(`- ${additionalSuppliers.length} additional suppliers added`);
        console.log('\nYou can now login with:');
        console.log('Username: admin');
        console.log('Password: admin123');

    } catch (error) {
        console.error('Error inserting sample data:', error);
    }
}

// Run if called directly
if (require.main === module) {
    insertSampleData().then(() => {
        database.close();
        process.exit(0);
    });
}

module.exports = { insertSampleData };