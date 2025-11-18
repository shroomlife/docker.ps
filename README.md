# 🐳 docker.ps

**Smart & Easy Docker Management**

[docker.ps](https://docker.ps) ist eine moderne Web-Anwendung zur zentralen Verwaltung von Docker-Containern auf mehreren Servern. Mit einer intuitiven Benutzeroberfläche kannst du Container auf allen deinen Docker-Hosts überwachen und steuern.

![docker.ps](https://docker.ps)

---

## 📋 Inhaltsverzeichnis

- [Überblick](#überblick)
- [Architektur](#architektur)
- [Features](#features)
- [Technologie-Stack](#technologie-stack)
- [Installation & Setup](#installation--setup)
  - [Hauptanwendung](#hauptanwendung)
  - [docker.ps-agent](#dockerps-agent)
- [Entwicklung](#entwicklung)
- [Produktion](#produktion)
- [Agent-Anpassungen](#agent-anpassungen)
- [Lizenz](#lizenz)

---

## 🎯 Überblick

docker.ps besteht aus zwei Hauptkomponenten:

1. **Hauptanwendung** - Die Web-UI und Backend-API, die auf [docker.ps](https://docker.ps) läuft
2. **docker.ps-agent** - Ein leichtgewichtiger Agent, der auf jedem überwachten Docker-Server läuft

Die Hauptanwendung kommuniziert sicher mit den Agents auf den entfernten Servern, um Container-Informationen abzurufen und Aktionen auszuführen.

---

## 🏗️ Architektur

```
┌─────────────────────────────────────────────────────────┐
│                    docker.ps Web App                     │
│  (Nuxt.js + PostgreSQL + Google OAuth)                  │
│                    https://docker.ps                     │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ HTTPS + Auth Key
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Server 1    │ │  Server 2    │ │  Server N    │
│              │ │              │ │              │
│ docker.ps-   │ │ docker.ps-   │ │ docker.ps-   │
│   agent      │ │   agent      │ │   agent      │
│              │ │              │ │              │
│  Port 3000   │ │  Port 3000   │ │  Port 3000   │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  Docker Daemon  │
              │  (via socket)   │
              └─────────────────┘
```

### Kommunikationsfluss

1. **Benutzer** meldet sich über Google OAuth an
2. **Hauptanwendung** speichert Docker-Hosts mit URL und Auth-Key
3. Bei Container-Anfragen sendet die Hauptanwendung HTTP-Requests an den Agent
4. **Agent** validiert den Auth-Key und kommuniziert mit dem lokalen Docker Daemon
5. Ergebnisse werden an die Hauptanwendung zurückgegeben und in der UI angezeigt

---

## ✨ Features

- 🔐 **Sichere Authentifizierung** - Google OAuth Integration
- 🖥️ **Multi-Host Management** - Verwalte Container auf mehreren Servern
- 📊 **Container-Übersicht** - Liste aller Container mit Status, Ports und Images
- 🎮 **Container-Steuerung** - Start, Stop, Restart, Pause, Unpause, Remove
- 🔑 **Sicherheit** - Auth-Key-basierte Kommunikation zwischen App und Agent
- 🚀 **Modern UI** - Intuitive Benutzeroberfläche mit Nuxt UI
- 📱 **Responsive** - Funktioniert auf Desktop und Mobile
- 🔄 **Echtzeit-Updates** - Aktuelle Container-Informationen

---

## 🛠️ Technologie-Stack

### Hauptanwendung
- **Framework**: [Nuxt.js](https://nuxt.com) 4.1.2
- **Runtime**: [Bun](https://bun.sh) 1.2.21
- **UI**: [Nuxt UI](https://ui.nuxt.com) 4.0.0-alpha.2
- **State Management**: [Pinia](https://pinia.vuejs.org) 3.0.3
- **Datenbank**: [PostgreSQL](https://www.postgresql.org) mit [Prisma](https://www.prisma.io) 6.16.2
- **Docker API**: [dockerode](https://github.com/apocas/dockerode) 4.0.8
- **Authentifizierung**: Google OAuth mit JWT

### Agent
- **Framework**: [Elysia](https://elysiajs.com) 1.4.4
- **Runtime**: [Bun](https://bun.sh) 1.2.21
- **Docker API**: [dockerode](https://github.com/apocas/dockerode) 4.0.8

---

## 🚀 Installation & Setup

### Hauptanwendung

#### Voraussetzungen

- [Bun](https://bun.sh) 1.2.21 oder höher
- [Docker](https://www.docker.com) und Docker Compose
- PostgreSQL (kann über Docker Compose gestartet werden)
- Google OAuth Credentials

#### 1. Repository klonen

```bash
git clone https://github.com/yourusername/docker.ps.git
cd docker.ps
```

#### 2. Dependencies installieren

```bash
bun install
```

#### 3. Umgebungsvariablen konfigurieren

Erstelle eine `.env` Datei im Root-Verzeichnis:

```env
# Database
DATABASE_URL="postgresql://dockerps:your_password@localhost:5432/dockerps?schema=public"

# Application
NUXT_COOKIE_SECRET="your-super-secret-cookie-key"
NUXT_JWT_SECRET="your-super-secret-jwt-key"
NUXT_SECRET_KEY="your-super-secret-key"
NUXT_PUBLIC_APP_URL="http://localhost:3000"
NUXT_PUBLIC_ENVIRONMENT="local"

# Google OAuth
NUXT_GOOGLE_PROJECT_ID="your-google-project-id"
NUXT_GOOGLE_CLIENT_ID="your-google-client-id"
NUXT_GOOGLE_CLIENT_SECRET="your-google-client-secret"
NUXT_GOOGLE_SCOPE="openid"
```

#### 4. Datenbank starten

```bash
# PostgreSQL mit Docker Compose starten
bun run docker:up

# Oder manuell:
docker compose up -d postgres_docker_ps
```

#### 5. Datenbank-Migrationen ausführen

```bash
# Prisma Client generieren
bun run db:generate

# Migrationen anwenden
bun run db:migrate
```

#### 6. Entwicklungsserver starten

```bash
bun run dev
```

Die Anwendung läuft nun auf [http://localhost:3000](http://localhost:3000)

---

### docker.ps-agent

Der **docker.ps-agent** muss auf jedem Server laufen, der überwacht werden soll. Er stellt eine sichere API bereit, über die die Hauptanwendung mit dem Docker Daemon kommuniziert.

#### Voraussetzungen

- [Docker](https://www.docker.com) installiert und laufend
- Zugriff auf `/var/run/docker.sock` (oder Docker TCP API)
- [Bun](https://bun.sh) 1.2.21 oder höher (für lokale Entwicklung)
- Oder Docker zum Ausführen des Container-Images

#### Installation auf dem Server

##### Option 1: Docker Container (Empfohlen)

```bash
# Agent-Container starten
docker run -d \
  --name docker-ps-agent \
  --restart unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v docker-ps-agent-data:/app/data \
  -p 3000:3000 \
  shroomlife/docker.ps-agent:latest
```

##### Option 2: Lokale Installation

```bash
# Repository klonen (nur apps/docker.ps-agent Ordner)
cd apps/docker.ps-agent

# Dependencies installieren
bun install

# Agent starten
bun run dev  # Development
# oder
NODE_ENV=production bun src/index.ts  # Production
```

#### Auth-Key abrufen

Beim ersten Start generiert der Agent automatisch einen Auth-Key und speichert ihn in `data/_auth.key`. Dieser Key wird in der Konsole ausgegeben:

```
🔑 Your Auth Key: docker_ps_<128-hex-characters>
```

**Wichtig**: Kopiere diesen Key - du brauchst ihn, um den Host in der Hauptanwendung hinzuzufügen!

#### Agent-URL ermitteln

Die Agent-URL ist die öffentlich erreichbare Adresse deines Servers:

- **Lokale Entwicklung**: `http://localhost:3000`
- **Produktion**: `https://your-server.com:3000` oder `http://your-server-ip:3000`

**Sicherheitshinweis**: In der Produktion solltest du einen Reverse-Proxy (z.B. Nginx) mit SSL/TLS verwenden!

#### Host in der Hauptanwendung hinzufügen

1. Melde dich bei [docker.ps](https://docker.ps) an
2. Gehe zu "Hosts" → "Neuer Host"
3. Gib ein:
   - **Name**: Ein beschreibender Name (z.B. "Production Server")
   - **URL**: Die Agent-URL (z.B. `https://your-server.com:3000`)
   - **Auth Key**: Der generierte Auth-Key vom Agent

4. Speichere den Host

Der Host sollte nun in der Liste erscheinen und du kannst Container verwalten!

---

## 💻 Entwicklung

### Hauptanwendung

```bash
# Dependencies installieren
bun install

# Entwicklungsserver starten
bun run dev

# Type-Checking
bun run typecheck

# Linting
bun run lint
bun run lint:fix

# Datenbank-Migrationen
bun run db:migrate      # Neue Migration erstellen
bun run db:generate     # Prisma Client generieren
bun run db:deploy       # Migrationen in Production anwenden

# Build für Production
bun run build

# Preview des Production-Builds
bun run preview
```

### Agent

```bash
cd apps/docker.ps-agent

# Dependencies installieren
bun install

# Entwicklungsserver starten (mit Watch-Mode)
bun run dev

# Docker-Image bauen
bun run docker:build

# Docker-Image pushen
bun run docker:push

# Build und Push
bun run docker:publish
```

### Projektstruktur

```
docker.ps/
├── app/                    # Nuxt.js Frontend
│   ├── components/         # Vue-Komponenten
│   ├── pages/              # Seiten-Routen
│   ├── stores/             # Pinia Stores
│   └── layouts/            # Layout-Komponenten
├── server/                 # Nuxt.js Backend
│   ├── api/                # API-Endpunkte
│   └── utils/              # Server-Utilities
├── apps/
│   └── docker.ps-agent/    # Agent-Anwendung
│       └── src/
│           └── index.ts    # Agent-Hauptdatei
├── prisma/                 # Prisma Schema & Migrationen
├── shared/                 # Geteilte Typen & Utilities
├── compose.yml             # Docker Compose für PostgreSQL
├── Dockerfile              # Dockerfile für Hauptanwendung
└── package.json
```

---

## 🏭 Produktion

### Hauptanwendung

#### Docker Build & Deploy

```bash
# Docker-Image bauen
bun run docker:build

# Docker-Image zu Docker Hub pushen
bun run docker:push

# Oder beides zusammen
bun run docker:publish
```

#### Docker Compose Beispiel

```yaml
version: '3.8'

services:
  docker-ps:
    image: shroomlife/docker.ps:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/dockerps
      - NUXT_COOKIE_SECRET=${COOKIE_SECRET}
      - NUXT_JWT_SECRET=${JWT_SECRET}
      - NUXT_SECRET_KEY=${SECRET_KEY}
      - NUXT_PUBLIC_APP_URL=https://docker.ps
      - NUXT_PUBLIC_ENVIRONMENT=production
      - NUXT_GOOGLE_PROJECT_ID=${GOOGLE_PROJECT_ID}
      - NUXT_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - NUXT_GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
    depends_on:
      - postgres

  postgres:
    image: postgres:latest
    restart: unless-stopped
    environment:
      - POSTGRES_DB=dockerps
      - POSTGRES_USER=dockerps
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Agent

Der Agent sollte auf jedem überwachten Server laufen. Siehe [Installation](#dockerps-agent) oben.

**Produktions-Empfehlungen**:

1. **Reverse Proxy**: Verwende Nginx oder Traefik mit SSL/TLS
2. **Firewall**: Beschränke Zugriff auf Port 3000 nur von der Hauptanwendung
3. **Monitoring**: Überwache den Agent-Container (z.B. mit Health-Checks)
4. **Backup**: Backupe regelmäßig das `data/` Verzeichnis (enthält den Auth-Key)

---

## 🔧 Agent-Anpassungen

Wenn neue Features für den Docker-Server hinzugefügt werden sollen, muss der **docker.ps-agent** entsprechend angepasst werden.

### Agent erweitern

Der Agent befindet sich in `apps/docker.ps-agent/src/index.ts`. Er verwendet [Elysia](https://elysiajs.com) als Web-Framework.

#### Beispiel: Neue Route hinzufügen

```typescript
// In apps/docker.ps-agent/src/index.ts

.get('/containers/:id/logs', async ({ params, query }) => {
  const container = DockerAPI.getContainer(params.id);
  const logs = await container.logs({
    stdout: true,
    stderr: true,
    tail: parseInt(query.tail || '100', 10),
  });
  return { logs: logs.toString() };
})
```

#### Workflow für neue Features

1. **Agent erweitern** (`apps/docker.ps-agent/src/index.ts`)
   - Neue Route hinzufügen
   - Dockerode API verwenden für Docker-Operationen

2. **Hauptanwendung anpassen**
   - Neue API-Endpunkte in `server/api/` erstellen
   - Frontend-Komponenten in `app/components/` erweitern
   - Types in `shared/types/` aktualisieren

3. **Agent neu bauen und deployen**
   ```bash
   cd apps/docker.ps-agent
   bun run docker:publish
   ```

4. **Agent auf allen Servern aktualisieren**
   ```bash
   docker pull shroomlife/docker.ps-agent:latest
   docker restart docker-ps-agent
   ```

### Verfügbare Docker-Operationen

Der Agent nutzt [dockerode](https://github.com/apocas/dockerode) für Docker-Operationen. Siehe die [dockerode Dokumentation](https://github.com/apocas/dockerode#dockerode) für alle verfügbaren Methoden.

**Aktuell implementiert**:
- ✅ Container auflisten
- ✅ Container-Details abrufen
- ✅ Container starten/stoppen
- ✅ Container pausieren/unpausieren
- ✅ Container neustarten
- ✅ Container entfernen

**Mögliche Erweiterungen**:
- 📋 Container-Logs abrufen
- 📊 Container-Statistiken (CPU, Memory, etc.)
- 🖼️ Images verwalten
- 🌐 Netzwerke verwalten
- 💾 Volumes verwalten

---

## 🔒 Sicherheit

### Auth-Key System

- Der Agent generiert beim ersten Start einen zufälligen Auth-Key
- Dieser Key wird in `data/_auth-key` gespeichert
- Die Hauptanwendung sendet diesen Key im `x-auth-key` Header
- Der Agent validiert den Key mit SHA-256 Hash-Vergleich
- Bei ungültigem Key wird der Request mit 401 abgelehnt

### Best Practices

- ✅ Verwende HTTPS für die Agent-Kommunikation (Reverse Proxy)
- ✅ Beschränke Firewall-Regeln auf die Hauptanwendung
- ✅ Rotiere Auth-Keys regelmäßig (Agent neu starten)
- ✅ Überwache Agent-Logs auf verdächtige Aktivitäten
- ✅ Verwende starke Secrets für die Hauptanwendung

---

## 📝 Lizenz

[Lizenz hier einfügen]

---

## 🤝 Beitragen

Beiträge sind willkommen! Bitte erstelle einen Issue oder Pull Request.

---

## 📞 Support

Bei Fragen oder Problemen:
- **Website**: [docker.ps](https://docker.ps)
- **Issues**: [GitHub Issues](https://github.com/yourusername/docker.ps/issues)

---

**Made with ❤️ for the Docker community**
