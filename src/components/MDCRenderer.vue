<script lang="ts">
import { computed, defineComponent, h, resolveComponent, VNode } from "vue";
import type { Element, ElementContent, Properties, RootContent } from "hast";

// hast property names that don't map 1:1 to the Vue/HTML attribute name
const PROPERTY_ALIASES: Record<string, string> = {
  className: "class",
  htmlFor: "for",
};

function toVueProps(properties: Properties = {}): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(properties)) {
    const propName = PROPERTY_ALIASES[key] ?? key;
    result[propName] = Array.isArray(value) ? value.join(" ") : value;
  }

  return result;
}

function toPascalCase(tagName: string): string {
  return tagName
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
}

/**
 * remark-mdc always kebab-cases custom component tags (`::MyAlert` ->
 * `<my-alert>`), native HTML tags from markdown never contain a hyphen —
 * enough to tell them apart without a full tag allowlist.
 */
function isCustomTag(tagName: string): boolean {
  return tagName.includes("-");
}

/**
 * Named slot marker produced by remark-mdc for `#name` slots. Adjust this
 * check if your remark-mdc version serializes named slots differently —
 * inspect a compiled `entry.html` with a `#slot` to confirm the shape.
 */
function isNamedSlot(node: ElementContent): node is Element {
  return (
    node.type === "element" &&
    node.tagName === "template" &&
    typeof node.properties?.slot === "string"
  );
}

const MDCRenderer = defineComponent({
  name: "MDCRenderer",

  props: {
    node: {
      type: Object as () => RootContent,
      required: true,
    },
  },

  setup(props) {
    const isElement = computed(() => props.node.type === "element");
    const isText = computed(() => props.node.type === "text");
    const element = computed(() => props.node as Element);

    // string passed to <component :is>: PascalCase for custom tags
    // (resolved against the app's component registry), the raw tag name
    // otherwise
    const tag = computed(() => {
      if (!isElement.value) return null;
      const tagName = element.value.tagName;
      return isCustomTag(tagName) ? toPascalCase(tagName) : tagName;
    });

    const vueProps = computed(() =>
      isElement.value ? toVueProps(element.value.properties) : {},
    );

    const defaultChildren = computed<ElementContent[]>(() =>
      isElement.value
        ? element.value.children.filter((child) => !isNamedSlot(child))
        : [],
    );

    const namedSlots = computed<Record<string, ElementContent[]>>(() => {
      if (!isElement.value) return {};

      const slots: Record<string, ElementContent[]> = {};

      for (const child of element.value.children) {
        if (isNamedSlot(child)) {
          slots[child.properties!.slot as string] = child.children;
        }
      }

      return slots;
    });

    return () => {
      if (isText.value) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (props.node as any).value;
      }

      if (isElement.value) {
        const slots: Record<string, () => VNode[]> = {
          default: () =>
            defaultChildren.value.map((child) =>
              h(MDCRenderer, { node: child, key: JSON.stringify(child) }),
            ),
        };

        for (const [name, children] of Object.entries(namedSlots.value)) {
          slots[name] = () =>
            children.map((child) =>
              h(MDCRenderer, { node: child, key: JSON.stringify(child) }),
            );
        }

        const tagValue = tag.value as string;

        // resolveComponent fonctionne car il est appelé PENDANT le rendu
        // (currentRenderingInstance est actif à ce moment) et va chercher
        // dans app.component() les composants enregistrés globalement.
        const resolved = isCustomTag(element.value.tagName)
          ? resolveComponent(tagValue)
          : tagValue;

        return h(resolved, vueProps.value, slots);
      }

      return null;
    };
  },
});

export default MDCRenderer;
</script>
