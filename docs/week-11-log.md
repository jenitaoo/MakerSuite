# Week 11
- Created the GitHub repo for MakerSuite.
- Registered for Etsy API.
- Defined naming conventions in a markdown file called `naming-ceonvetions.md`.
- Set up the initial directory structure.
- Followed [this tutorial](https://medium.com/@rutujagurav72/containerizing-a-web-app-a-beginners-guide-to-django-postgresql-and-react-with-docker-5b72f61c3031) to connect a React frontend with a Django backend and a PostgreSQL database.

# Important Notes
## Access Applications When Docker Containers Are Running
- pgAdmin: http://localhost:5050
- Frontend: [http://localhost:5173](http://localhost:5173/)
- Backend API: [http://localhost:8000](http://localhost:8000/)
- Django Admin: [http://localhost:8000/admin](http://localhost:8000/admin)

## Application Commands
docker-compose build
docker-compose up -d

# Activities Logging
## How I Linked The Frontend, Backend And Database
- Followed [this tutorial](https://medium.com/@rutujagurav72/containerizing-a-web-app-a-beginners-guide-to-django-postgresql-and-react-with-docker-5b72f61c3031) to connect a React frontend with a Django backend and a PostgreSQL database.
- I cloned the repo.
- Used the command `docker-compose build` to build all of the components together.
- Used Docker Desktop as my tool for managing the running containers.

- Created my Django superuser
	- Username: root
	- Email address: C22448184@mytudublin.ie
	- Password: password

- Downloaded DBeaver to use to manage my PostgreSQL database.
	- Got this error:
`Failure in connecting to Drill: oadd.org.apache.drill.exec.rpc.RpcException: Failure setting up ZK for client.`
`Failure setting up ZK for client.`
`KeeperErrorCode = ConnectionLoss for /drill`
	- Fixed the error by

- Had an issue where my tables existed in the Django models and in Postgres through the console but I couldn't access the tables using DBeaver.
- Ended up making a new docker container for pgAdmin to manage my Postgres database.

Pushed this application with the containerised web app with authentication to GitHub.



# FYP Student Supervisor Meeting Notes
- Work on the interim code submission.
- For the demo, prioritise being able to demonstrate all components defined in my logical architecture set up and working with each other.
- Demonstrate a full flow e.g. Interactive UI with React, backend logic performed with Django, data persistence with PostgreSQL as well as an API call to an external marketplace API.
- Key point: Keep it simple, what the above can look like could be a clickable button that tells you logic has been processed by Django and saved in the database. and the API call can look like a button that returns data. An additional goal could be writing data.
