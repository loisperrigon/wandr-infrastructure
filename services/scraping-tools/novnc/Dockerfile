FROM arm64v8/ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    novnc \
    websockify \
    net-tools \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 6080

CMD ["/usr/share/novnc/utils/launch.sh", "--vnc", "scraping-backend:5900", "--listen", "6080"]