# docker.ps-agent

Der **docker.ps-agent** ist ein leichtgewichtiger Service, der auf Docker-Hosts läuft und eine sichere REST-API bereitstellt, um mit dem lokalen Docker Daemon zu kommunizieren. Er fungiert als Brücke zwischen der Hauptanwendung (docker.ps) und den Docker-Hosts, auf denen Container verwaltet werden sollen.

## 🎯 Zweck

Der Agent ermöglicht es der docker.ps Hauptanwendung, Container auf entfernten Servern zu verwalten, ohne dass die Hauptanwendung direkten Zugriff auf die Docker-Sockets der entfernten Hosts benötigt. Dies ermöglicht:

- **Multi-Host Management**: Verwalte Container auf mehreren Servern von einer zentralen Anwendung aus
- **Sichere Kommunikation**: Authentifizierung über Auth-Keys statt direkter Socket-Zugriffe
- **Isolation**: Der Agent läuft isoliert auf jedem Host und hat nur Zugriff auf den lokalen Docker Daemon
- **Einfache Skalierung**: Neue Hosts können einfach hinzugefügt werden, indem der Agent dort installiert wird

## 🏗️ Architektur

```
┌─────────────────────┐
│  docker.ps          │
│  Hauptanwendung     │
└──────────┬──────────┘
           │
           │ HTTPS + Auth Key
           │
           ▼
┌─────────────────────┐
│  docker.ps-agent    │
│  (Port 3000)        │
└──────────┬──────────┘
           │
           │ Docker Socket
           │ (/var/run/docker.sock)
           ▼
┌─────────────────────┐
│  Docker Daemon      │
└─────────────────────┘
```

## 🔐 Sicherheit

### Authentifizierung

Der Agent verwendet ein **Auth-Key-System** zur Authentifizierung:

1. **Automatische Key-Generierung**: Beim ersten Start wird automatisch ein eindeutiger Auth-Key generiert
2. **Key-Speicherung**: Der Key wird in `data/_auth.key` gespeichert
3. **Key-Validierung**: Alle Anfragen müssen den Auth-Key im Header `x-auth-key` mitführen
4. **SHA-256 Hashing**: Keys werden als SHA-256 Hash verglichen (nicht als Plaintext)
5. **Key-Überwachung**: Änderungen am Key-File führen zum automatischen Stopp des Services

### Key-Format

```
docker_ps_<128 hex characters>
```

Beispiel: `docker_ps_a1b2c3d4e5f6...`

## 📡 API-Endpunkte

Alle Endpunkte erfordern den Auth-Key im Header `x-auth-key`.

### Health Check

```http
GET /
```

Prüft, ob der Agent läuft. Gibt `200 OK` zurück.

### Container auflisten

```http
GET /containers
```

Gibt eine Liste aller Container zurück (inklusive gestoppter Container).

**Response**: Array von `ContainerInfo` Objekten

### Container-Details abrufen

```http
GET /containers/:id
```

Gibt detaillierte Informationen zu einem spezifischen Container zurück.

**Response**: `ContainerInspectInfo` Objekt

### Container starten

```http
GET /containers/:id/start
```

Startet einen gestoppten Container.

**Response**: Aktualisierte `ContainerInspectInfo`

### Container stoppen

```http
GET /containers/:id/stop
```

Stoppt einen laufenden Container.

**Response**: Aktualisierte `ContainerInspectInfo`

### Container neustarten

```http
GET /containers/:id/restart
```

Startet einen Container neu.

**Response**: Aktualisierte `ContainerInspectInfo`

### Container pausieren

```http
GET /containers/:id/pause
```

Pausiert einen laufenden Container.

**Response**: Aktualisierte `ContainerInspectInfo`

### Container fortsetzen

```http
GET /containers/:id/unpause
```

Setzt einen pausierten Container fort.

**Response**: Aktualisierte `ContainerInspectInfo`

### Container entfernen

```http
GET /containers/:id/remove
```

Entfernt einen Container (mit `force: true`).

**Response**: `{ message: "Container {id} has been removed." }`

### Container-Logs abrufen

```http
GET /containers/:id/logs?tail=1000&follow=false
```

**Query-Parameter**:
- `tail` (optional): Anzahl der letzten Log-Zeilen (Standard: 1000)
- `follow` (optional): `true` für Streaming-Modus (Server-Sent Events), `false` für einmalige Abfrage

**Response (follow=false)**: 
```json
{
  "logs": ["log line 1", "log line 2", ...]
}
```

**Response (follow=true)**: Server-Sent Events Stream mit kontinuierlichen Log-Updates

## 🚀 Installation & Deployment

### Voraussetzungen

- Docker installiert und laufend
- Zugriff auf `/var/run/docker.sock` (oder Docker HTTP API im Development-Modus)

### Docker-Image bauen

```bash
cd apps/docker.ps-agent
bun run docker:build
```

### Docker-Image veröffentlichen

```bash
bun run docker:publish
```

Dies baut das Image und pusht es zu `shroomlife/docker.ps-agent:latest`.

### Agent auf einem Host starten

```bash
docker run -d \
  --name docker-ps-agent \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v docker-ps-agent-data:/app/data \
  -p 3000:3000 \
  shroomlife/docker.ps-agent:latest
```

**Wichtig**: 
- Der Docker Socket muss gemountet werden: `-v /var/run/docker.sock:/var/run/docker.sock`
- Das `data/` Verzeichnis sollte als Volume gemountet werden, damit der Auth-Key persistent bleibt
- Port 3000 muss erreichbar sein (oder ein anderer Port via `-p HOST_PORT:3000`)

### Auth-Key abrufen

Nach dem Start des Containers kann der Auth-Key aus den Logs abgerufen werden:

```bash
docker logs docker-ps-agent | grep "Your Auth Key"
```

Oder direkt aus dem Container:

```bash
docker exec docker-ps-agent cat /app/data/_auth.key
```

**Wichtig**: Dieser Key muss in der Hauptanwendung gespeichert werden, um mit dem Agent zu kommunizieren.

## 💻 Entwicklung

### Lokale Entwicklung

```bash
# Dependencies installieren
bun install

# Development-Server starten
bun run dev
```

Der Agent läuft dann auf `http://localhost:3000`.

**Hinweis**: Im Development-Modus verbindet sich der Agent über HTTP mit dem Docker Daemon (`localhost:2375`). Stelle sicher, dass der Docker Daemon HTTP-API aktiviert hat oder verwende Docker Desktop.

### Produktions-Modus

Im Produktions-Modus (wenn `NODE_ENV=production` gesetzt ist) verwendet der Agent den Docker Socket (`/var/run/docker.sock`).

## 🔧 Konfiguration

### Umgebungsvariablen

- `NODE_ENV`: Setze auf `production` für Produktions-Modus (verwendet Docker Socket statt HTTP)

### Verzeichnisstruktur

```
/app
├── src/
│   └── index.ts          # Hauptanwendung
├── data/
│   └── _auth.key         # Auth-Key (wird automatisch erstellt)
├── package.json
├── Dockerfile
└── tsconfig.json
```

## 🛠️ Technologie-Stack

- **Runtime**: [Bun](https://bun.sh) - Schnelle JavaScript Runtime
- **Framework**: [Elysia](https://elysiajs.com) - Hochperformantes Web-Framework
- **Docker API**: [dockerode](https://github.com/apocas/dockerode) - Node.js Docker API Client

## 📝 Erweiterungen

Um neue Features hinzuzufügen:

1. **Neue Route in `src/index.ts` hinzufügen**
2. **Dockerode API verwenden** für Docker-Operationen
3. **Agent neu bauen und deployen**: `bun run docker:publish`
4. **Hauptanwendung anpassen** um die neue Route zu nutzen

Siehe die [dockerode Dokumentation](https://github.com/apocas/dockerode#dockerode) für alle verfügbaren Docker-Operationen.

## ⚠️ Fehlerbehebung

### "Cannot connect to Docker Daemon"

- Stelle sicher, dass Docker läuft: `docker ps`
- Prüfe, ob der Socket gemountet ist: `ls -la /var/run/docker.sock`
- Im Development-Modus: Prüfe, ob Docker HTTP API aktiviert ist

### "401 Unauthorized"

- Prüfe, ob der Auth-Key korrekt im Header `x-auth-key` gesendet wird
- Stelle sicher, dass der Key aus `data/_auth.key` verwendet wird
- Prüfe, ob der Key das korrekte Format hat: `docker_ps_<128 hex chars>`

### "Auth Key file has been changed externally"

- Der Agent stoppt automatisch, wenn das Key-File extern geändert wird (Sicherheitsfeature)
- Starte den Container neu, um einen neuen Key zu generieren

## 📄 Lizenz

Siehe Hauptprojekt-Lizenz.
