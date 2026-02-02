# HBnB Evolution – Technical Documentation (Part 1)

## Project Context

This repository, **holbertonschool-hbnb**, contains the comprehensive technical documentation for the
**HBnB Evolution** project – a Holberton School initiative to design and build a scalable, 
production-ready application inspired by the AirBnB platform.

**Part 1** establishes the foundational architecture and design patterns that will guide all subsequent development phases.
This phase focuses on defining the **global architecture**, establishing clear separation of concerns, 
and documenting the key design decisions. The documentation includes both high-level overviews and 
detailed domain model specifications that serve as the blueprint for implementation.

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

HBnB Evolution is a comprehensive property rental platform designed to provide a complete ecosystem for hosts 
and guests. The application enables users to:

- **Manage user accounts** – Create profiles, authenticate, and manage user information with support for both hosts and guests
- **Create and manage places** – List properties with detailed information, amenities, pricing, and availability
- **Leave reviews** – Allow guests to rate and review their experiences at properties
- **Manage amenities** – Define and categorize property amenities to help users filter and discover suitable accommodations

The architecture is designed to be modular, scalable, and maintainable, supporting future enhancements and 
additional features as the platform grows.

The detailed behavior and specific requirements for these features will be progressively defined 
in subsequent phases of the project.

---

## Architecture Overview

HBnB Evolution employs a **three-layer architecture** pattern, a well-established approach that promotes 
clean code, separation of concerns, and high maintainability. Each layer has distinct responsibilities 
and interacts with adjacent layers through well-defined interfaces:

### Layers

**Presentation Layer**  
Handles all user-facing interactions through RESTful APIs and web services. This layer is responsible 
for request validation, response formatting, and client communication. It remains agnostic to business logic 
and delegates all processing to the Business Logic Layer.

**Business Logic Layer**  
The core of the application containing all domain-specific rules, validations, and algorithms. This layer 
defines the key entities (Users, Places, Reviews, Amenities) and manages their relationships and interactions. 
It is independent of how data is persisted or presented, ensuring that business logic can be reused across 
different interfaces or storage mechanisms.

**Persistence Layer**  
Manages all data storage and retrieval operations. This layer abstracts the underlying database implementation, 
allowing the system to switch between different storage solutions (SQL, NoSQL, etc.) without impacting the 
business logic. It provides a clean interface for data access through repositories or similar patterns.

### Design Pattern: Facade

Communication between these layers is orchestrated through the **Facade design pattern**, which provides 
a unified, simplified interface for interacting with complex subsystems. This approach:
- **Prevents tight coupling** – Layers remain independent and can be modified independently
- **Simplifies interactions** – Complex internal logic is hidden behind a clean interface
- **Enhances maintainability** – Changes to one layer don't ripple through others
- **Facilitates testing** – Layers can be unit tested in isolation

---

## High-Level Package Diagram

The diagram below provides a comprehensive visual representation of the application's architecture.
It illustrates the three-layer structure of the application, the separation of concerns, and the 
communication patterns between layers through the Facade pattern. This diagram serves as the starting 
point for understanding the overall system organization and will guide the detailed design decisions 
in subsequent sections.

![High-Level Package Diagram](./package_diagram.png)

The editable Mermaid source for this diagram is available in `package_diagram.mmd` for future modifications.

---

## Detailed Class Diagram for Business Logic Layer

### Overview

The Business Logic Layer is the heart of the HBnB Evolution application. This layer defines all core domain entities,
their relationships, and the rules that govern their interactions. The class diagram below provides an in-depth view
of the domain model, illustrating how entities such as Users, Places, Reviews, and Amenities are structured and 
interconnected.

### Key Components

This layer encapsulates:

- **Entity Classes** – Represent core business concepts (User, Place, Review, Amenity)
- **Relationships** – Capture associations between entities (e.g., a User can host multiple Places, a Place can have multiple Reviews)
- **Validations & Business Rules** – Enforce constraints and ensure data integrity at the business level
- **Domain Logic** – Implement complex operations that involve interactions between multiple entities

### Diagram

The class diagram below visualizes the complete structure of the Business Logic Layer, showing all entities,
their attributes, methods, and relationships:

![Detailed Class Diagram for Business Logic Layer](./class.png)

This diagram serves as the blueprint for implementation and helps developers understand the domain model
without needing to navigate the actual codebase.

---

## Scope of This Phase

**Part 1** of the HBnB Evolution project is specifically focused on:

- **Architectural Design** – Establishing a solid, scalable foundation using the three-layer pattern
- **Layered Organization** – Clearly separating concerns across Presentation, Business Logic, and Persistence layers
- **Design Patterns** – Implementing the Facade pattern to manage inter-layer communication
- **Domain Modeling** – Defining the core entities and their relationships in the Business Logic Layer
- **Documentation** – Creating comprehensive technical documentation that serves as the blueprint for development

### What's NOT Included in This Phase

- Implementation code or working prototypes
- Database schema or persistence logic
- API endpoint specifications or request/response examples
- Authentication and authorization details
- Deployment or DevOps configurations

### Next Steps

Additional details and implementation specifications will be introduced progressively in later phases:
- **Part 2** – API design and endpoint specifications
- **Part 3** – Database design and persistence layer implementation
- **Part 4** – Implementation of the complete application
- **Part 5** onwards – Advanced features, testing, and deployment

---

## Authors

- **Lorenzo Anselme** – Architecture and design contributions
- **Lucas Mettetal** – Architecture and design contributions

**Project:** HBnB Evolution – Holberton School  
**Last Updated:** February 2026  
**Version:** 1.0
