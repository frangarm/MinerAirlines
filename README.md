# Miner Airlines

[![License: MIT](https://img.shields.io)](https://opensource.org) 

This project will be used to allow our fellow miners to book flights on our Web-Based service. Users can log in as either Admin, Pilots, Flight Attendants, Customers and do user specific tasks such as managing flights, managing schedules, or book flights.

Learn more about the people behind this project: [About Us](AboutUs.md)

### Access to the website can be found publicly with no installation required can be found: [here](https://team-8-8a989.web.app/)

## Alternatively, you can getting started with testing

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Ensure the following are installed:

Node.js (recommended: v18 or newer)

npm (comes with Node)

Modern web browser (Chrome recommended)

### Verify installation:

````bash
node -v
npm -v
````


## 0. Node not Installed

If both commands return version numbers, you can skip to Step 1.

### Install on macOS

Using Homebrew (recommended):

````bash
brew install node
````
*Or download the installer from:* [nodejs.org](https://nodejs.org/)

### Install on Windows

Go to: 
[nodejs.org](https://nodejs.org/)

Download the LTS version

Run the installer and follow the prompts

Restart your terminal after installation

### Install on Linux (Ubuntu/Debian)
````bash
sudo apt update
sudo apt install nodejs npm
````

## 1. Clone the Repository

````bash
git clone https://github.com/UTEP-CS-SP26/project-repository-agile-8.git
cd project-repository-agile-8
````

## 2. Install Dependencies

From the project root:

````bash
npm install
````

This installs all required packages including React, Firebase, Webpack, and Babel.

## 3. Firebase Configuration

The Firebase configuration is already included in src/index.js.

No additional setup is required. Simply proceed to building and running the application.

## 4a. Build the Project

To perform a one-time build:

````bash
npm run build
````

Webpack will compile the project into the dist/ folder.

Open with Live Server

## 4b. Run in Development Mode
````bash
npm run dev
````

This will:

Launch the webpack development server

Enable hot reload

Automatically open the default dashboard


# Booking a flight and creating an account

<img width="1440" height="778" alt="Screenshot 2026-04-29 at 11 33 45 PM" src="https://github.com/user-attachments/assets/cb3b770c-50f8-46ff-b804-4f868fb567e3" />

## 1. Select log in button from dashboard taskbar
<img width="538" height="60" alt="Screenshot 2026-04-29 at 11 34 44 PM" src="https://github.com/user-attachments/assets/5ccd12aa-da14-4977-924a-7236bb0b9b4d" />

## 2a. Log in with credentials

<img width="540" height="480" alt="Screenshot 2026-04-29 at 11 35 32 PM" src="https://github.com/user-attachments/assets/819e04e5-ebb0-46b4-93cf-762467ea0b8e" />

## 2b. If no previous account created, select create one option.

<img width="208" height="32" alt="Screenshot 2026-04-29 at 11 37 16 PM" src="https://github.com/user-attachments/assets/cdb2f452-fe22-42f9-aa9a-a92190d25fec" />


## 2c. Enter relevant information and select account type.

<img width="684" height="777" alt="Screenshot 2026-04-29 at 11 37 31 PM" src="https://github.com/user-attachments/assets/141b1be3-dd2e-48ac-b119-317fb3188eeb" />


## 3a. Search for flight from manually entering in information 

<img width="538" height="476" alt="Screenshot 2026-04-29 at 11 40 37 PM" src="https://github.com/user-attachments/assets/6bdee945-6e4b-405d-a5d3-9a6b6faefb2b" />

## 3b. Find flight from schedule tab

<img width="942" height="314" alt="Screenshot 2026-04-29 at 11 43 00 PM" src="https://github.com/user-attachments/assets/32f31852-4650-4191-9c51-3eb621be18b7" />

## 4. Select flight and book seat, marking any special accommodations

<img width="1326" height="585" alt="Screenshot 2026-04-29 at 11 44 00 PM" src="https://github.com/user-attachments/assets/38f737c1-eb16-4afe-aa3a-6e7d6d312b99" />


## 5. Enter payment information and checkout.
<img width="980" height="511" alt="Screenshot 2026-04-29 at 11 45 09 PM" src="https://github.com/user-attachments/assets/a858366b-0558-4423-8f22-5aa220ad138f" />


# Customer dashboard

<img width="1440" height="741" alt="Screenshot 2026-04-29 at 11 51 11 PM" src="https://github.com/user-attachments/assets/de249f33-01d8-4566-b42e-66ccdd1126ce" />

# Rewards dashboard

<img width="1440" height="774" alt="Screenshot 2026-04-29 at 11 51 41 PM" src="https://github.com/user-attachments/assets/aee681e5-ac29-49fd-9ef1-9930d30dc8d5" />

# User boarding passes

<img width="925" height="660" alt="Screenshot 2026-04-29 at 11 52 05 PM" src="https://github.com/user-attachments/assets/8ace2282-4899-4f8c-8d3c-a1d89831ffdb" />

# Admin dashboard

<img width="1190" height="631" alt="Screenshot 2026-04-29 at 11 52 34 PM" src="https://github.com/user-attachments/assets/1b8780ad-48ad-41e9-bbc7-c4c35ba3475e" />

<img width="1172" height="740" alt="Screenshot 2026-04-29 at 11 52 58 PM" src="https://github.com/user-attachments/assets/9b9a9b38-da73-45c0-a4e7-1fae2dd003b7" />
