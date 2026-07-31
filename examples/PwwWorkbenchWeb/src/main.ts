import { createApp } from "vue";
import { createPinia } from "pinia";
import "phoenix-wing/style.css";
import PwwApp from "./App.vue";

createApp(PwwApp).use(createPinia()).mount("#pww-app");
