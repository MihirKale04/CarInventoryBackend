# Car Inventory Backend API

This project provides a RESTful API built with **Node.js** and **Express.js** to manage a car inventory, with data persistently stored in a **SQL Server** database. It serves as the backend for the SwiftUI iOS application.

## Features

- **RESTful API**: Standard HTTP methods (`GET`, `POST`, `DELETE`) for interacting with car data.
- **Database Integration**: Connects to SQL Server to store and retrieve car inventory details.
- **Normalized Schema**: Works with a normalized SQL database structure (`Makes`, `CarModels`, `CarInventory`).
- **Error Handling**: Provides informative error responses for common issues.
- **Basic Data Management**:
  - List all cars
  - Get car by ID
  - Add new cars (handling make and model normalization)
  - Delete car by ID
  - Delete all cars

## Technologies Used

- **Node.js**: JavaScript runtime environment.
- **Express.js**: Fast, unopinionated, minimalist web framework for Node.js.
- **mssql**: Official Microsoft SQL Server client for Node.js.
- **dotenv**: For loading environment variables from a `.env` file (secure handling of credentials).
- **SQL Server**: Relational database management system.
