import { DataTypes, Model, Optional } from "sequelize";
import type { Sequelize } from "sequelize";

export interface EmployeeAttributes {
  id: number;
  employeeId: string;
  userEmail: string;
  position: string;
  departmentId: number;
  hireDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeCreationAttributes extends Optional<
  EmployeeAttributes,
  "id" | "hireDate" | "createdAt" | "updatedAt"
> {}

export class Employee
  extends Model<EmployeeAttributes, EmployeeCreationAttributes>
  implements EmployeeAttributes
{
  public id!: number;
  public employeeId!: string;
  public userEmail!: string;
  public position!: string;
  public departmentId!: number;
  public hireDate!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default function (sequelize: Sequelize): typeof Employee {
  Employee.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      employeeId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      userEmail: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      position: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      departmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      hireDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "Employee",
      tableName: "employees",
      timestamps: true,
    },
  );
  return Employee;
}
