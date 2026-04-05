import { DataTypes, Model, Optional } from "sequelize";
import type { Sequelize } from "sequelize";

export interface RequestItemAttributes {
  id: number;
  requestId: number;
  name: string;
  qty: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestItemCreationAttributes extends Optional<
  RequestItemAttributes,
  "id" | "createdAt" | "updatedAt"
> {}

export class RequestItem
  extends Model<RequestItemAttributes, RequestItemCreationAttributes>
  implements RequestItemAttributes
{
  public id!: number;
  public requestId!: number;
  public name!: string;
  public qty!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default function (sequelize: Sequelize): typeof RequestItem {
  RequestItem.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      requestId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
      modelName: "RequestItem",
      tableName: "request_items",
      timestamps: true,
    },
  );
  return RequestItem;
}
