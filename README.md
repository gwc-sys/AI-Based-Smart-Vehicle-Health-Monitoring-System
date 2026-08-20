# 🚗⚡ AI-Powered IoT Vehicle Health Monitoring System

> A cloud-connected smart vehicle monitoring platform that combines **IoT sensors, real-time cloud data, AI-oriented health monitoring, mobile visualization, emergency detection, and guardian alerts**.

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54-black.svg)](https://expo.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Cloud-orange.svg)](https://firebase.google.com/)

---

## 📖 Overview

Modern electric and connected vehicles generate valuable real-time information that can be used to improve **vehicle safety, health monitoring, emergency response, and predictive maintenance**.

This project provides an end-to-end platform for collecting vehicle and sensor data from an IoT device and delivering it to a cloud-connected mobile application.

The system is designed around the following flow:

```text
┌─────────────────────┐
│   Vehicle / Sensors │
│                     │
│ • Health Sensors    │
│ • Vehicle Data      │
│ • GPS               │
│ • Emergency Events  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   IoT Controller    │
│                     │
│ ESP / Wi-Fi Device  │
│ Arduino Firmware    │
└──────────┬──────────┘
           │ Internet
           ▼
┌─────────────────────┐
│       Firebase      │
│                     │
│ • Authentication    │
│ • Realtime Data     │
│ • Firestore         │
│ • Cloud Services    │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────────────┐
│      React Native / Expo App     │
│                                  │
│ • Live Monitoring                │
│ • Vehicle Analytics              │
│ • Charts & Visualization         │
│ • Alerts                         │
│ • GPS Tracking                   │
│ • Emergency Response             │
└──────────────────────────────────┘
```

---

# ✨ Features

## 📡 Real-Time IoT Monitoring

Monitor vehicle and connected sensor data through a cloud-connected architecture.

* Real-time sensor data
* Vehicle status monitoring
* Cloud synchronization
* Live updates through Firebase
* Historical data support
* Connected device architecture

---

## ❤️ Health & Safety Monitoring

The platform supports monitoring safety-related information that can be associated with the vehicle or driver.

Possible monitored parameters include:

* Heart rate
* SpO₂ / oxygen saturation
* Vehicle health indicators
* Abnormal sensor readings
* Emergency conditions

When critical conditions are detected, the system can trigger an emergency workflow.

---

## 🚨 Smart Emergency / SOS System

The application includes a dedicated emergency response architecture.

When an SOS or critical alert is detected:

```text
Sensor / Vehicle Alert
        │
        ▼
Firebase Realtime Database
        │
        ▼
Mobile Application
        │
        ├── Get Current Location
        │
        ├── Retrieve Emergency Contacts
        │
        ├── Build Emergency Message
        │
        ├── Notify Guardians
        │      ├── WhatsApp
        │      └── SMS
        │
        ▼
Emergency Response Status
```

Emergency information can include:

* Alert type
* Vehicle/device identifier
* GPS coordinates
* Health sensor readings
* Nearby or associated hospital information
* Timestamp

---

## 📍 Location Tracking

The mobile application uses device location services to provide location-aware monitoring and emergency response.

Features include:

* Current location retrieval
* GPS coordinates
* Location sharing
* Google Maps links for emergency alerts
* Background monitoring support

---

## 📱 Cross-Platform Mobile Application

Built using **React Native and Expo**, the application is designed for modern mobile development.

Supported targets include:

* Android
* iOS
* Web

---

## 📊 Data Visualization

The project includes charting capabilities for presenting monitoring data in an understandable format.

Examples:

* Vehicle metrics
* Sensor trends
* Historical readings
* Health indicators
* Real-time analytics

---

## 🔐 Authentication

Firebase Authentication is integrated to support secure user access.

The project includes support for authentication services and Google Sign-In integration.

---

# 🏗️ Technology Stack

| Layer                | Technologies                         |
| -------------------- | ------------------------------------ |
| Mobile App           | React Native                         |
| Development Platform | Expo                                 |
| Language             | TypeScript                           |
| Cloud Backend        | Firebase                             |
| Authentication       | Firebase Auth                        |
| Real-Time Data       | Firebase Realtime Database           |
| Database             | Cloud Firestore                      |
| Navigation           | React Navigation                     |
| IoT Firmware         | Arduino / C++                        |
| Location             | Expo Location                        |
| Notifications        | Expo Notifications                   |
| Background Tasks     | Expo Background Fetch & Task Manager |
| Charts               | React Native Chart Kit               |
| HTTP Client          | Axios                                |

---

# 📂 Project Structure

```text
IoT-cloud-connected-EV-monitoring/
│
├── android/                     # Native Android project
├── assets/
│   └── images/                  # Application assets
│
├── constants/                   # Shared constants
│
├── dataconnect/                 # Firebase Data Connect resources
│
├── scripts/                     # Utility and build scripts
│
├── src/
│   ├── components/              # Reusable UI components
│   ├── hooks/                   # Custom React hooks
│   ├── services/                # Firebase and application services
│   ├── screens/                 # Application screens
│   └── dataconnect-generated/   # Generated Data Connect code
│
├── AI_Vehical.ino               # IoT / Arduino firmware
├── Final_VehicalWiFi.h          # Vehicle Wi-Fi configuration
├── heart_Reat.cpp               # Sensor-related C++ code
│
├── App.tsx                      # Application entry point
├── app.json                     # Expo configuration
├── firebase.json                # Firebase configuration
├── package.json                 # Dependencies and scripts
│
├── ARCHITECTURE.md              # System architecture documentation
├── AUTH_SETUP.md                # Authentication setup guide
├── INTEGRATION_CODE.md          # Integration documentation
├── PROJECT_WORKING.md           # Project workflow documentation
├── QUICK_INTEGRATION.md         # Quick integration guide
├── SOS_EMERGENCY_INTEGRATION.md # Emergency system documentation
│
└── README.md
```

---

# ⚙️ Getting Started

## Prerequisites

Make sure you have the following installed:

* Node.js
* npm
* Git
* Expo tooling
* Android Studio for Android development
* Firebase project

For physical IoT hardware:

* Compatible microcontroller
* Wi-Fi connectivity
* Required sensors
* USB programming cable

---

## 1. Clone the Repository

```bash
git clone https://github.com/gwc-sys/IoT-cloud-connected-EV-monitoring.git

cd IoT-cloud-connected-EV-monitoring
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Configure Firebase

Create and configure a Firebase project.

The application uses Firebase services such as:

* Authentication
* Firestore
* Realtime Database
* Cloud-connected application services

Review the repository configuration and setup documentation before adding production credentials.

Useful project documentation:

```text
AUTH_SETUP.md
INTEGRATION_CODE.md
QUICK_INTEGRATION.md
SOS_EMERGENCY_INTEGRATION.md
```

> ⚠️ Never commit private API keys, credentials, service-account files, or production secrets to a public repository.

---

## 4. Start the Application

```bash
npm start
```

This launches the Expo development environment.

---

# 📱 Running on Android

You can run the Android application with:

```bash
npm run android
```

The project also provides:

```bash
npm run android:all
```

For generating or updating native projects:

```bash
npm run prebuild
```

or:

```bash
npm run prebuild:android
```

---

# 🌐 Running on Web

```bash
npm run web
```

To export the web application:

```bash
npm run build
```

---

# 🍎 Running on iOS

```bash
npm run ios
```

> iOS builds require a compatible macOS development environment.

---

# 🔍 Code Quality

Run linting with:

```bash
npm run lint
```

The project also includes a Firebase diagnostic command:

```bash
npm run firebase:doctor
```

---

# 🔌 IoT Device Integration

The repository includes embedded firmware files for communicating with the cloud-connected monitoring system.

Key files include:

```text
AI_Vehical.ino
Final_VehicalWiFi.h
heart_Reat.cpp
```

The intended IoT workflow is:

```text
Sensors
   │
   ▼
Microcontroller
   │
   ├── Collect sensor readings
   │
   ├── Detect abnormal conditions
   │
   ├── Connect through Wi-Fi
   │
   ▼
Firebase Cloud
   │
   ▼
Mobile Application
```

Depending on your hardware setup, you may need to update:

* Wi-Fi credentials
* Firebase configuration
* Device identifiers
* Sensor pins
* Threshold values
* API endpoints

---

# 🚨 Emergency Response Architecture

The emergency system is designed to respond to critical events.

```text
┌──────────────────────┐
│ Critical Event       │
│                      │
│ • Crash              │
│ • SOS                │
│ • Abnormal Reading   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Firebase Alert       │
└──────────┬───────────┘
           │
           ▼
┌─────────────────────────────┐
│ Background Monitoring       │
│                             │
│ • Listen for alerts         │
│ • Check active emergencies  │
│ • Trigger notifications     │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Emergency Response          │
│                             │
│ • Get user location         │
│ • Load emergency contacts   │
│ • Build alert message       │
│ • Trigger outreach          │
└──────────────┬──────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
    WhatsApp         SMS
        │             │
        └──────┬──────┘
               ▼
       Emergency Contacts
```

The application also tracks outreach status so users can see whether the emergency workflow has been initiated.

---

# 🧠 Future AI Capabilities

The architecture can be extended with AI and machine-learning features such as:

* Predictive vehicle maintenance
* Battery health prediction
* Sensor anomaly detection
* Driver health anomaly detection
* Crash-risk analysis
* Vehicle fault classification
* Remaining useful life estimation
* Intelligent alert prioritization

Example pipeline:

```text
IoT Sensor Data
      │
      ▼
Data Collection
      │
      ▼
Cloud Storage
      │
      ▼
AI / ML Analysis
      │
      ├── Normal Condition
      │
      └── Abnormal Condition
               │
               ▼
        Predictive Alert
               │
               ▼
       Mobile Notification
```

---

# 🛣️ Roadmap

* [x] React Native / Expo application
* [x] Firebase integration
* [x] IoT firmware integration
* [x] Real-time monitoring architecture
* [x] Location services
* [x] Emergency alert system
* [x] Guardian outreach workflow
* [x] WhatsApp/SMS emergency integration
* [x] Data visualization
* [ ] Advanced AI anomaly detection
* [ ] Predictive maintenance models
* [ ] Battery degradation analysis
* [ ] Advanced fleet dashboard
* [ ] Cloud Functions for automated notifications
* [ ] Improved device provisioning
* [ ] Production-grade analytics

---

# 📚 Documentation

Additional documentation is available in the repository:

| Document                       | Description                                 |
| ------------------------------ | ------------------------------------------- |
| `ARCHITECTURE.md`              | Emergency system architecture and data flow |
| `AUTH_SETUP.md`                | Authentication configuration                |
| `INTEGRATION_CODE.md`          | Integration reference                       |
| `PROJECT_WORKING.md`           | Project workflow                            |
| `QUICK_INTEGRATION.md`         | Quick setup and integration                 |
| `SOS_EMERGENCY_INTEGRATION.md` | Emergency/SOS implementation                |

---

# 🤝 Contributing

Contributions, improvements, bug fixes, and feature suggestions are welcome.

To contribute:

```bash
# Fork the repository

# Create a feature branch
git checkout -b feature/your-feature

# Make your changes

# Commit
git commit -m "Add your feature"

# Push
git push origin feature/your-feature
```

Then open a Pull Request.

---

# 🔒 Security

Please do not expose:

* Firebase private credentials
* Production API keys
* Wi-Fi passwords
* User personal data
* Emergency contact information

Use environment variables or secure configuration management for sensitive production values.

---

# 📄 License

This project is licensed under the **MIT License**.

See the [LICENSE](LICENSE) file for details.

---

# 🌟 Project Vision

The goal of this project is to demonstrate how **IoT, cloud computing, mobile applications, real-time monitoring, and AI** can work together to build a smarter vehicle ecosystem.

```text
IoT + Cloud + Mobile + AI
            │
            ▼
   Safer Connected Vehicles
            │
            ▼
 Better Monitoring & Faster
    Emergency Response
```

---

## ⭐ Support the Project

If you find this project useful:

* ⭐ Star the repository
* 🍴 Fork it
* 🐛 Report issues
* 💡 Suggest improvements
* 🤝 Contribute

---

<p align="center">
  Built for the future of <b>connected, intelligent, and safer vehicles</b> 🚗⚡
</p>
