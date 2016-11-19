## BUILD

```
docker build -t google-music-player .
```

## RUN

```
docker run -d -p xxx:3000 -e GOOGLE_EMAIL="xxx" -e GOOGLE_PASS="xxxx" -e API_KEY="xxxx" --restart=always --name google-music-player google-music-player
```