FROM node:14

RUN apt-get update && apt-get install -y ffmpeg

COPY . /app

WORKDIR /app

RUN yarn install

ENV MPD_LIBRARY /music

ENTRYPOINT ["yarn", "start"]
