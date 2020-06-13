FROM node

RUN apt-get update && apt-get install -y ffmpeg

COPY . /app

WORKDIR /app

RUN yarn install

ENTRYPOINT ["yarn", "start"]
