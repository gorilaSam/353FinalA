'use strict';


// load package
const express = require('express');
const app = express();
var path = require('path');
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
var mysql = require('mysql');

const PORT = 8080;
const HOST = '0.0.0.0';

var con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: '353final'
});

//Landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/menu.html'));
});
//Employee webpage
app.get('/employeesOnly', (req, res) => {
    res.sendFile(path.join(__dirname + '/employeePage.html'));
});
//Is my order ready? page
app.get('/isOrderReady', (req, res) => {
    res.sendFile(path.join(__dirname + '/orderReadyPage.html'));
});
//background image hosting
app.get('/background', (req, res) => {
    res.sendFile(path.join(__dirname + '/coffee_background.png'));
});


//Establish connection
con.connect((err) => {
    if(err){
        console.log('MySQL NOT connected.');
        console.log(err);
    }else{
        console.log('MySql connected.');
    };
});

//End Database connection
app.get('/end', (req, res) => {
    con.end(function (err) {
        if (err) console.log(err);
        console.log("off");
    });
    res.send("Connection ended.");
});

//Add new products to the menu
app.post('/addProduct', (req, res) => {
    console.log('Adding Product:');
    //Get params for the new menu item from client
    var product = req.body.name;
    var price = req.body.price;
    //Insert into menu table in database
    var sql = "INSERT INTO menu (ProductName, Price) VALUES ('" + product + "', " + price + ")";
    con.query(sql, function (err, result) {
        if (err) console.log(err);
        res.send('Success.');
    });
});

//Delete products from menu
app.post('/deleteProduct', (req, res) =>{
    console.log('Deleting Product: ');
    var product = req.body.name.trim();
    //query a delete from the menu table
    var sql = 'DELETE FROM menu WHERE ProductName = ?'
    console.log(product);
    con.query(sql, product, function (err, result) {
        if (err){
            console.log(err);
            return res.send('Error deleting product. Is the name spelled correctly?');
        }
        console.log(result);
        if (result['affectedRows'] == 0){
            return res.send('Product not removed. Is the name spelled correctly?');
        }
        res.send('Success.');
    });
})

//Add orders from a cart to orders table
app.post('/order', (req, res) => {
    console.log('Order Submission: ');
    var cartList = req.body.cart;
    var customer = req.body.customer;
    //creates an order table for a single customer, named after their name
    var sql = "CREATE TABLE order_" + customer + " (ProductName varchar(128), Price FLOAT)";
    con.query(sql, function (err, result) {
        if (err) console.log(err);
    });
    //Iterate and insert the products from cartList into the table
    var i;
    for (i = 1; i < cartList.length; i++) {
        var sql = "INSERT INTO order_" + customer + " (ProductName, Price) VALUES ('"+cartList[i][0]+"', "+cartList[i][1]+")";
        con.query(sql, function (err, result) {
            if (err) {
                console.log(err);
            }
            console.log(result);
        });
    } 
    res.send('Order submitted.')
});

//Display active orders
app.get('/activeOrders', (req, res) => {
    console.log('Loading active orders: ');
    //SQL commands to display all the customer order tables to the client page in order FIFO
    //Select all tables that have the 'order_' prefix and return their names
    var sql = `SELECT TABLE_NAME
    FROM information_schema.tables
    WHERE table_name like "%order%"
    ORDER BY CREATE_TIME DESC`;
    con.query(sql, function (err, result) {
        if (err) console.log(err);
        //iterate and split names of customers into a list
        var activeOrders = [];
        var i;
        for (i=0; i < result.length; i++){
            activeOrders[activeOrders.length] = result[i]['TABLE_NAME'].split('_')[1];
        }
        res.json(activeOrders);
    });
})

//Return Order information of a given customer to the employee page
app.post('/displayOrder', (req, res) => {
    console.log('Returning contents of an order: ');
    var name = req.body.name;
    name = name.trim();
    var sql = 'SELECT * FROM order_'+name;
    con.query(sql, function (err, result) {
        if (err) throw err;
        res.json(result);
    });
});

//Complete's an order. 
//Drops the customers order table and adds them to the table of completed orders
app.post('/completeOrder', (req, res) => {
    console.log('Completing an order: ');
    var customerName = req.body.name.trim();
    var tableName = 'order_' + customerName;
    var sql = 'DROP TABLE '+tableName;
    con.query(sql, function (err, result) {
        if (err) {console.log(err)}
        else{
            res.json('Order completed.');
        };
    });
    var sql_2 = 'INSERT INTO completed (name) VALUES (?)'
    con.query(sql_2, (customerName), function (err, result) {
        if (err) console.log(err);
        console.log(result)
    });
});

//Checks to see if customer's name is in the table of completed orders
app.post('/checkOrderReady', (req, res) => {
    var name = req.body.name;
    var sql = 'SELECT * FROM completed';
    con.query(sql, function (err, result) {
        if (err) console.log(err);
        var i;
        for (i=0; i < result.length; i++){
            if (result[i]['name'] == name){
                return res.send('Order Completed!');
            };
        } ;
        res.send('Order not yet completed.')
    });
});

//Return menu table from database to client
app.get('/menu', (req, res) => {
    var sql = 'SELECT * FROM menu';
    con.query(sql, function (err, result) {
        if (err) throw err;
        res.json(result);
    });
});


app.use('/', express.static('pages'));
console.log('up and running on port 8080');


app.listen(PORT, HOST);
