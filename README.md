Welcome to `sprint-4` branch

# InnoJob - your last stop before you find your job in Innopolis SEZ!

InnoJob aggregates all vacancies from all headhunting sites that are available in Innopolis Special Economic Zone

![Logo](pics/IU2.png)

[innojob.ru](http://innojob.ru) (Will be unavailable after August 2nd 2025)

*Video Placeholder*

***

# Project Information

## Project Context

![Project Context Diagram](<docs/Project Context Diagram.png>)

## Roadmap

- [x] Job listing
    - [x] Vacancies from HH.ru
    - [x] Vacancies from SuperJob
    - [ ] Vacancies/Internships from Telegram
- [X] User
    - [x] User authentication
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

- By default, the config file is not generated. You should copy `config_template.y` and rename it to `config.py`

```shell
cp config_template.py config.py
```

- You should also changed `SERVER_URL` to URL of your server or `https://localhost:8000` if you want to run site locally

```js
export const SERVER_URL = "http://localhost:8000";
```

- By default, `nginx` configuration reads SSL certificates. You can disable this by commenting out whole nginx configuraion in `compose.yaml`

```yaml
  # nginx:
  #   image: nginx:latest
  #   ports:
  #     - "80:80"
  #     - "443:443"
  #   volumes:
  #     - ./nginx/conf/:/etc/nginx/conf.d/:ro
  #     - ./nginx/ssl/:/etc/nginx/ssl/:ro
  #   depends_on:
  #     - server
  #   restart: unless-stopped
```

# Architecture

[docs/architecture/architecture.md](docs/architecture/architecture.md)

# Usefulness and Transition Report (for customer)

[docs/reports/transition-report.md](docs/reports/transition-report.md)

# AI Usage Report (for customer)

[docs/reports/ai-usage.md](docs/reports/ai-usage.md)

# Contacts

Mikhail Krylov, DevOps - m.krylov@innopolis.university