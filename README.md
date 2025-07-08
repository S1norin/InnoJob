# InnoJob - your last stop before you find your job in Innopolis SEZ!

InnoJob aggregates all vacancies from all headhunting sites that are available in Innopolis Special Economic Zone

![Logo](logo.png)

[innojob.ru](http://innojob.ru)

*Video Placeholder*

***

# Project Information

## Project Context

![Project Context Diagram](<docs/Project Context Diagram.png>)

## Roadmap

- [x] Job listing
    - [x] Vacancies from HH.ru
    - [ ] Vacancies from SuperJob
    - [ ] Vacancies/Internships from Telegram
- [X] User
    - [ ] User authentication
    - [x] CV Upload
        - [x] "Skiils" field
        - [x] Bio
    - [ ] Privacy settings
- [ ] Job hunter listing
    - [ ] Cards based on user CV
    - [ ] "Contact person" button
        - [ ] via Email
        - [ ] via Telegram

# Usage

1. Access site via [innojob.ru](http://innojob.ru)
2. Click the "Find the job" or choose "Log In" to log into site with your account

    1. In case if you don't have an account, you should sign up by clicling according button
3. After you log in with your credentials, you will get access to `/job_listing` with vacancies.
4. You can access your user profile by clicing on icon with person

    1. In your profile you can upload one CV and change information about yourself

- Job hunters listing is still in development

## Deployment

### Requirments

In order to deploy project, you need to instal `docker`

### Running project

Run `docker compose up --build` to run the project. By default, the site can be accessed via your IP addres and port `80`, however, you can change port by editing `nginx/nginx.conf`


# Architecture

### Static view

![Static view diagram](docs/architecture/static-view/diagram.png)

The system follow layered microservice architecture with external services integration

1. Components

    1. Frontend: HTML/CSS/JS
    2. API: FastAPI for handling HTTP requests
    3. User service: manages accounts and authentification
    4. Vacancy service: Manages job vacancies and parser
    5. Database: Data storage via PostgreSQL
    6. HH.ru API/ Telegram API: external services
2. Coupling and Cohesion:

    1. Coupling: Loose coupling via microservices architecture
    2. Cohesion:

        1. User/Vacancy service: High cohesion with related operations
        2. Database access encapsulated
3. Maintainability impact:

    1. Clear separation of functionality improves maitainability
    2. Independent service development
    3. Database abstraction allows schema changes
    4. Well-defined API backend/frontend contrast


### Dynamic view

![Dynamic view diagram](docs/architecture/dynamic-view/diagram.png)

Non-trivial request: CV upload

1. Sequence Description

    1. User submits CV via web form
    2. Frontend sends PDF to API gateway
    3. API gateway routes to user sevice
    4. User service stores CV in database as bytecode
    5. Database confirms successfull write
    6. Success responce returned to user
2. Performance metric

    1. Average time of request: 280 ms

### Deployment view
![Deployment view diagram](docs/architecture/deployment-view/diagram.jpeg)

1. App is deployed in `Docker Compose` via `python` and `postgres` images

2. Docker exposes only `8080` port for `fastAPI` backend.

3. `nginx` on server forwards `8080` port to `80` and `innojob.ru` to `89.169.35.122`

It can be deployed on client server via `docker compose up` in the root of project, although it would be available on different port (`8080`)
