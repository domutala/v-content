<script setup lang="ts">
import { onMounted } from "vue";
import HelloWorld from "./components/HelloWorld.vue";
import TheWelcome from "./components/TheWelcome.vue";

onMounted(async () => {
  const docs = await queryCollection("docs").path("/docs/get-started").first();
  console.log(docs);
});

const html =
  '<h1 id="pluto">Pluto</h1><p><strong>Pluto</strong> (minor-planet designation: <em>134340 Pluto</em>) is a <a href="https://en.wikipedia.org/wiki/Dwarf_planet" rel="nofollow">dwarf planet</a> in the <a href="https://en.wikipedia.org/wiki/Kuiper_belt" rel="nofollow">Kuiper belt</a>.</p><h2 id="history">History</h2><h3 id="sub-history">Sub History</h3><p>In the 1840s, <a href="https://wikipedia.org/wiki/Urbain_Le_Verrier" rel="nofollow">Urbain Le Verrier</a> used Newtonian mechanics to predict the position of the then-undiscovered planet <a href="https://wikipedia.org/wiki/Neptune" rel="nofollow">Neptune</a> after analyzing perturbations in the orbit of <a href="https://wikipedia.org/wiki/Uranus" rel="nofollow">Uranus</a>.</p><hr><p>Just a link: <a href="http://www.nasa.gov" rel="nofollow">www.nasa.gov</a>.</p><ul class="contains-task-list"><li>Lists</li><li class="task-list-item"><input disabled type="checkbox"> todo</li><li class="task-list-item"><input disabled type="checkbox" checked> done</li></ul><p>A table:</p><table><thead><tr><th>a</th><th>b</th></tr></thead></table><details><summary>Show example</summary><pre><code class="language-js">console.log("Hi pluto!");\n</code></pre></details><div class="p-4"><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p></div><router-link to="/hello"></router-link>';
</script>

<template>
  <header>
    <img
      alt="Vue logo"
      class="logo"
      src="./assets/logo.svg"
      width="125"
      height="125"
    />

    <div class="wrapper">
      <HelloWorld msg="You did it!" />
    </div>
  </header>

  <main>
    <MDC :value="html" />
    <!-- <TheWelcome /> -->
  </main>
</template>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
