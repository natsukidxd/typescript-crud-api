// src/_helpers/db.ts
import mysql from "mysql2/promise";
import { Sequelize } from "sequelize";
import { env } from "./env";


export interface Database {
    User: any; // We'll type this properly after creating the model
    Department: any;
    Employee: any;
    Request: any;
    RequestItem: any;
}

export const db: Database = {} as Database;

export async function initialize(): Promise<void> {
    const host = env.DB_HOST;
    const port = env.DB_PORT;
    const user = env.DB_USER;
    const password = env.DB_PASSWORD;
    const database = env.DB_NAME;
    
    // Create database if it doesn't exist
    const connection = await mysql.createConnection({ host, port, user, password });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    await connection.end();

    // Connect to database with Sequelize
    const sequelize = new Sequelize(database, user, password, { dialect: "mysql" });

    // Initialize models
    const { default: userModel } = await import("../users/user.model");
    db.User = userModel(sequelize);
    const { default: departmentModel } = await import("../departments/department.model");
    db.Department = departmentModel(sequelize);
    const { default: employeeModel } = await import("../employees/employee.model");
    db.Employee = employeeModel(sequelize);
    const { default: requestModel } = await import("../requests/request.model");
    db.Request = requestModel(sequelize);
    const { default: requestItemModel } = await import("../requests/requestItem.model");
    db.RequestItem = requestItemModel(sequelize);

    db.Department.hasMany(db.Employee, {
        foreignKey: "departmentId",
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
    });
    db.Employee.belongsTo(db.Department, {
        foreignKey: "departmentId",
    });

    db.Request.hasMany(db.RequestItem, {
        as: "items",
        foreignKey: "requestId",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    });
    db.RequestItem.belongsTo(db.Request, {
        foreignKey: "requestId",
    });

    // Sync models with database
    await sequelize.sync({ alter: true });
    console.log("Database initialized and models synced");
}
