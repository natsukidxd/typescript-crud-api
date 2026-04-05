import { DataTypes, Model, Optional } from "sequelize";
import type { Sequelize } from "sequelize";

export interface RequestAttributes {
  id: number;
  userId: number;
  date: Date;
  type: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestCreationAttributes extends Optional<
  RequestAttributes,
  "id" | "date" | "status" | "createdAt" | "updatedAt"
> {}

export class Request
  extends Model<RequestAttributes, RequestCreationAttributes>
  implements RequestAttributes
{
  public id!: number;
  public userId!: number;
  public date!: Date;
  public type!: string;
  public status!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default function (sequelize: Sequelize): typeof Request {
  Request.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Pending",
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
      modelName: "Request",
      tableName: "requests",
      timestamps: true,
    },
  );
  return Request;
}
