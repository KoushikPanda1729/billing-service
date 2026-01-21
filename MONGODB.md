# MongoDB Setup Guide

## Docker Setup

Pull image ---> docker pull mongo

Create volume ---> docker volume create billing-service-mddata

Run container --->
docker run -d \
 --rm \
 --name mongodb-billing-service \
 -p 27018:27017 \
 -v billing-service-mddata:/data/db \
 -e MONGO_INITDB_ROOT_USERNAME=root \
 -e MONGO_INITDB_ROOT_PASSWORD=root \
 mongo

## Container Management

Check container ---> docker ps

Stop container ---> docker stop mongodb-billing-service

Start container ---> docker start mongodb-billing-service

Restart container ---> docker restart mongodb-billing-service

View logs ---> docker logs mongodb-billing-service

Remove container ---> docker rm mongodb-billing-service

Remove volume ---> docker volume rm billing-service-mddata

## MongoDB Shell Commands

Access shell ---> docker exec -it mongodb-billing-service mongosh -u root -p root --authenticationDatabase admin

Create/Switch database ---> use billing-service

Create collection ---> db.createCollection("test")

Show databases ---> show dbs

Show collections ---> show collections

Show current database ---> db

## CRUD Operations

Insert one document ---> db.collectionName.insertOne({ field: "value" })

Insert many documents ---> db.collectionName.insertMany([{ field: "value1" }, { field: "value2" }])

Find all documents ---> db.collectionName.find()

Find with filter ---> db.collectionName.find({ field: "value" })

Find one document ---> db.collectionName.findOne({ field: "value" })

Update one document ---> db.collectionName.updateOne({ field: "value" }, { $set: { newField: "newValue" } })

Update many documents ---> db.collectionName.updateMany({ field: "value" }, { $set: { newField: "newValue" } })

Delete one document ---> db.collectionName.deleteOne({ field: "value" })

Delete many documents ---> db.collectionName.deleteMany({ field: "value" })

Count documents ---> db.collectionName.countDocuments()

Drop collection ---> db.collectionName.drop()

Drop database ---> db.dropDatabase()

Exit shell ---> exit

## Connection Details

Connection String ---> mongodb://root:root@localhost:27018/billing-service?authSource=admin

Database Name ---> billing-service

Port ---> 27018 (mapped from container's 27017)

Host ---> localhost

Username ---> root

Password ---> root

Auth Database ---> admin

## Application Config

Config file location ---> config/development.yaml

Database URL in config --->
database:
url: "mongodb://root:root@localhost:27018/billing-service?authSource=admin"

## Troubleshooting

Check port 27018 ---> lsof -i :27018

Reset everything --->
docker stop mongodb-billing-service
docker rm mongodb-billing-service
docker volume rm billing-service-mddata
