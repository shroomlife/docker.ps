<script setup lang="ts">
const userStore = useUserStore()

interface Feature {
  icon: string
  title: string
  description: string
}

// Only real, shipping capabilities — no roadmap promises.
const features: Feature[] = [
  {
    icon: 'tabler:server-bolt',
    title: 'Multi-host control',
    description: 'Register any number of Docker hosts and switch between them from one dashboard — each reached through its own lightweight agent.',
  },
  {
    icon: 'tabler:stack-2',
    title: 'Full container lifecycle',
    description: 'Start, stop, restart, pause, unpause and remove containers, and inspect their full configuration, ports, mounts and networks.',
  },
  {
    icon: 'tabler:terminal-2',
    title: 'Live log streaming',
    description: 'Follow container logs in real time over a streamed connection, with timestamps and one-click full-log download.',
  },
  {
    icon: 'tabler:photo',
    title: 'Image management',
    description: 'Browse images per host with repository, tag and size, inspect their details, and remove the ones you no longer need.',
  },
]

const securityPoints = [
  { icon: 'tabler:lock', label: 'Auth keys encrypted at rest (AES-256-GCM)' },
  { icon: 'tabler:shield-check', label: 'SSRF-guarded host connections' },
  { icon: 'tabler:cookie', label: 'httpOnly session cookies' },
]

const steps = [
  {
    number: '01',
    title: 'Run the agent',
    description: 'Drop the small docker.ps agent next to the Docker socket on each host you want to manage.',
  },
  {
    number: '02',
    title: 'Connect securely',
    description: 'Add the host with its URL and auth key. The key is encrypted before it ever touches the database.',
  },
  {
    number: '03',
    title: 'Run your fleet',
    description: 'Manage containers, stream logs and clean up images across every host from a single place.',
  },
]
</script>

<template>
  <div class="flex flex-col gap-24 py-12 sm:py-16">
    <!-- Hero -->
    <section class="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
      <div class="flex flex-col items-start gap-7">
        <span class="inline-flex items-center gap-2 rounded-full border border-default bg-muted/50 px-3 py-1 text-sm font-medium text-muted">
          <span class="size-2 rounded-full bg-green" />
          Open-core Docker management
        </span>

        <h1 class="text-5xl font-bold leading-tight text-balance sm:text-6xl">
          Your whole Docker fleet,
          <span class="text-green">one calm dashboard.</span>
        </h1>

        <p class="max-w-xl text-lg text-pretty text-muted">
          docker.ps connects to every host through its own secure agent, so you can run containers,
          stream logs and manage images from one place — self-hosted, on your own infrastructure.
        </p>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <UButton
            v-if="userStore.getIsLoggedIn"
            label="Open dashboard"
            color="primary"
            size="xl"
            icon="tabler:layout-dashboard"
            to="/app"
          />
          <UButton
            v-else
            label="Get started"
            color="primary"
            size="xl"
            trailing-icon="tabler:arrow-right"
            to="/profile/login"
          />
          <UButton
            label="See what it does"
            color="neutral"
            variant="subtle"
            size="xl"
            to="#features"
          />
        </div>

        <ul class="flex flex-col gap-2 pt-2">
          <li
            v-for="point in securityPoints"
            :key="point.label"
            class="flex items-center gap-2.5 text-sm text-muted"
          >
            <UIcon
              :name="point.icon"
              class="size-5 shrink-0 text-green"
            />
            {{ point.label }}
          </li>
        </ul>
      </div>

      <!-- Palestinian-flag emblem: black/white/green bands + red chevron + tatreez overlay -->
      <div class="relative mx-auto w-full max-w-md">
        <div class="ps-flag relative aspect-[4/3] overflow-hidden rounded-3xl shadow-xl ring-1 ring-black/5">
          <div class="absolute inset-x-0 top-0 h-1/3 bg-black" />
          <div class="absolute inset-x-0 top-1/3 h-1/3 bg-white" />
          <div class="absolute inset-x-0 bottom-0 h-1/3 bg-green" />
          <div class="ps-chevron absolute inset-y-0 left-0 w-2/5 bg-red" />
          <div class="ps-tatreez absolute inset-0 opacity-[0.06]" />
          <div class="absolute inset-0 flex items-center justify-center">
            <MainIcon
              :width="120"
              :height="120"
              class="ps-emblem drop-shadow-lg"
            />
          </div>
        </div>
        <p class="mt-4 text-center text-sm text-muted">
          Built in solidarity — colours of the Palestinian flag. 🇵🇸
        </p>
      </div>
    </section>

    <!-- Tatreez divider -->
    <div
      class="ps-tatreez-strip h-3 w-full rounded-full"
      aria-hidden="true"
    />

    <!-- Features -->
    <section
      id="features"
      class="flex flex-col gap-10 scroll-mt-24"
    >
      <div class="flex max-w-2xl flex-col gap-3">
        <h2 class="text-3xl font-bold text-balance sm:text-4xl">
          Everything you need to run containers in production
        </h2>
        <p class="text-pretty text-muted">
          A focused toolset for day-to-day operations — no bloat, no lock-in.
        </p>
      </div>

      <div class="grid gap-5 lg:grid-cols-3">
        <!-- Security: the signature, full-height tile -->
        <article class="relative flex flex-col justify-between gap-8 overflow-hidden rounded-3xl bg-green p-8 text-white lg:row-span-2">
          <div class="ps-tatreez absolute inset-0 opacity-10" />
          <div class="relative flex flex-col gap-4">
            <UIcon
              name="tabler:shield-lock"
              class="size-10"
            />
            <h3 class="text-2xl font-bold">
              Secure by design
            </h3>
            <p class="text-pretty text-white/85">
              Security is not an add-on. Host auth keys are encrypted at rest with AES-256-GCM,
              every outbound connection is SSRF-guarded, and your session lives in an httpOnly cookie.
            </p>
          </div>
          <ul class="relative flex flex-col gap-3">
            <li
              v-for="point in securityPoints"
              :key="point.label"
              class="flex items-center gap-3 text-sm font-medium"
            >
              <UIcon
                :name="point.icon"
                class="size-5 shrink-0"
              />
              {{ point.label }}
            </li>
          </ul>
        </article>

        <article
          v-for="feature in features"
          :key="feature.title"
          class="flex flex-col gap-4 rounded-3xl border border-default bg-default p-7 transition-shadow hover:shadow-md"
        >
          <div class="flex size-12 items-center justify-center rounded-2xl bg-green/10 text-green">
            <UIcon
              :name="feature.icon"
              class="size-6"
            />
          </div>
          <h3 class="text-xl font-bold">
            {{ feature.title }}
          </h3>
          <p class="text-pretty text-muted">
            {{ feature.description }}
          </p>
        </article>
      </div>
    </section>

    <!-- How it works -->
    <section class="flex flex-col gap-10">
      <h2 class="max-w-2xl text-3xl font-bold text-balance sm:text-4xl">
        Up and running in three steps
      </h2>
      <ol class="grid gap-5 sm:grid-cols-3">
        <li
          v-for="step in steps"
          :key="step.number"
          class="relative flex flex-col gap-3 rounded-3xl border border-default bg-default p-7"
        >
          <span class="text-4xl font-bold text-green/30">{{ step.number }}</span>
          <h3 class="text-xl font-bold">
            {{ step.title }}
          </h3>
          <p class="text-pretty text-muted">
            {{ step.description }}
          </p>
        </li>
      </ol>
    </section>

    <!-- Final CTA -->
    <section class="relative overflow-hidden rounded-3xl bg-black px-8 py-14 text-white sm:px-14 sm:py-20">
      <div class="ps-chevron-cta absolute inset-y-0 left-0 w-1/3 bg-red opacity-90" />
      <div class="relative flex flex-col items-start gap-6">
        <h2 class="max-w-2xl text-3xl font-bold text-balance sm:text-4xl">
          Take control of your containers today
        </h2>
        <p class="max-w-xl text-pretty text-white/80">
          Sign in and connect your first host in minutes. Your infrastructure, your data, your rules.
        </p>
        <UButton
          :label="userStore.getIsLoggedIn ? 'Open dashboard' : 'Get started'"
          color="primary"
          size="xl"
          trailing-icon="tabler:arrow-right"
          :to="userStore.getIsLoggedIn ? '/app' : '/profile/login'"
        />
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
/* Red chevron pointing right — the recurring Palestinian-flag structural motif. */
.ps-chevron {
  clip-path: polygon(0 0, 100% 50%, 0 100%);
}

.ps-chevron-cta {
  clip-path: polygon(0 0, 100% 50%, 0 100%);
}

/* Tatreez-inspired diamond cross-stitch pattern (geometric, not literal). */
.ps-tatreez,
.ps-tatreez-strip {
  background-image:
    repeating-linear-gradient(45deg, currentColor 0, currentColor 2px, transparent 2px, transparent 9px),
    repeating-linear-gradient(-45deg, currentColor 0, currentColor 2px, transparent 2px, transparent 9px);
}

.ps-tatreez {
  color: #000;
}

.ps-tatreez-strip {
  color: var(--color-red);
  background-color: color-mix(in oklab, var(--color-green) 12%, transparent);
}

.ps-emblem {
  animation: ps-float 6s ease-in-out infinite;
}

@keyframes ps-float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ps-emblem {
    animation: none;
  }
}
</style>
