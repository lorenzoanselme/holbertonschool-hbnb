# HBnB Evolution – Technical Documentation (Part 1)

## Project Context

This repository, **holbertonschool-hbnb**, contains the technical documentation for the
**HBnB Evolution** project.

Part 1 focuses on defining the **global architecture** of the application.
At this stage, the work is limited to high-level design and documentation.
No detailed business logic diagrams or implementation are included yet.

All files related to this phase are located directly inside the `part1/` directory.

---

## Part 1 Objective

The objective of this first phase is to provide a clear and structured overview of the
application architecture in order to prepare the upcoming development stages.

This documentation:
- Describes how the application is structured
- Explains how responsibilities are separated
- Introduces the communication pattern used between layers

---

## Application Overview

HBnB Evolution is a simplified AirBnB-like application that will allow users to:
- Manage user accounts
- Create and manage places
- Leave reviews for places
- Manage amenities

The detailed behavior of these features will be defined in later phases of the project.

---

## Architecture Overview

The application follows a **three-layer architecture**:

- **Presentation Layer**  
  Handles user interactions through APIs and services.

- **Business Logic Layer**  
  Contains the core application rules and domain concepts.

- **Persistence Layer**  
  Responsible for data storage and retrieval.

Communication between these layers is achieved through the **Facade design pattern**,
which provides a unified interface and prevents tight coupling between components.

---

## High-Level Package Diagram

The diagram below represents the current state of the architecture documentation.
It illustrates the three-layer structure of the application and the communication
between layers through the Facade pattern.

![High-Level Package Diagram](./package_diagram.png)

The editable Mermaid source for this diagram is available in `package_diagram.mmd`.

---

## Scope of This Phase

This phase focuses exclusively on:
- High-level architectural design
- Layered organization of the system
- Use of the Facade pattern for inter-layer communication

Additional UML diagrams and implementation details will be introduced
progressively in later parts of the project.

---

## Authors

- Lorenzo Anselme  
- Lucas Mettetal  

HBnB Evolution – Holberton School
