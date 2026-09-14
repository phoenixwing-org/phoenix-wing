import { createApp } from "vue";
import { createPinia } from "pinia";
import "phoenix-wing/style.css";
import PwwApp from "./PwwExampleApp.vue";

createApp(PwwApp).use(createPinia()).mount("#pww-app");
