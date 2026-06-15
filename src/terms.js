// ---------------------------------------------------------------------------
// AI-in-business term library
// ---------------------------------------------------------------------------
// A prepopulated, searchable collection of the SOPHISTICATED vocabulary a CTO,
// CISO, VP Eng, or B2B buyer actually uses when discussing AI — not the generic
// "AI strategy" surface terms. Two jobs:
//
//   1. Browse / search it      ->  `node index.js terms [query]`  /  web explorer
//   2. Feed the podcast search ->  terms tagged { keyword: true } become the
//                                  default Podcast Index search terms.
//
// Each entry:
//   term      the phrase itself
//   category  grouping (see CATEGORIES)
//   aka       alternate spellings / synonyms (also matched by search)
//   note      one-line plain-English gloss (optional)
//   keyword   true => used as a default ranking keyword (★)
// ---------------------------------------------------------------------------

export const CATEGORIES = {
  strategy: 'Strategy & operating model',
  economics: 'Economics & unit cost',
  agents: 'Agents & orchestration',
  models: 'Models & techniques',
  infra: 'Infra, inference & LLMOps',
  governance: 'Security, risk & governance',
  org: 'Org, talent & adoption',
  market: 'Market, providers & compute',
};

export const TERMS = [
  // --- Strategy & operating model -----------------------------------------
  { term: 'enterprise AI', category: 'strategy', keyword: true, aka: ['enterprise genai'], note: 'AI deployed at company scale, not a demo' },
  { term: 'AI strategy', category: 'strategy', keyword: true, note: 'where and how the business deploys AI' },
  { term: 'AI operating model', category: 'strategy', aka: ['target operating model', 'operating model'] },
  { term: 'AI center of excellence', category: 'strategy', aka: ['ai coe', 'coe', 'center of excellence'] },
  { term: 'AI-native architecture', category: 'strategy', aka: ['ai-native', 'ai native', 'greenfield ai'], note: 'systems designed around models from the start' },
  { term: 'build vs buy', category: 'strategy', aka: ['build versus buy', 'make or buy'], note: 'in-house model/app vs a vendor' },
  { term: 'platform vs point solution', category: 'strategy', aka: ['point solution', 'ai platform', 'consolidation'] },
  { term: 'vendor lock-in', category: 'strategy', aka: ['lock-in', 'switching costs', 'model portability'] },
  { term: 'use-case portfolio', category: 'strategy', aka: ['ai portfolio', 'use case prioritization'] },
  { term: 'pilot to production', category: 'strategy', aka: ['poc', 'proof of concept', 'pilot purgatory', 'production'], note: 'the gap most AI projects die in' },
  { term: 'business case', category: 'strategy', aka: ['value realization', 'value case', 'roi case'] },

  // --- Economics & unit cost ----------------------------------------------
  { term: 'cost per token', category: 'economics', keyword: true, aka: ['tokens', 'token cost', 'token costs', 'price per token', 'token pricing'], note: 'the atomic unit of LLM spend' },
  { term: 'inference cost', category: 'economics', keyword: true, aka: ['cost of inference', 'inference economics', 'serving cost'] },
  { term: 'unit economics', category: 'economics', aka: ['cost per query', 'cost per request', 'cost per task'] },
  { term: 'FinOps for AI', category: 'economics', aka: ['ai finops', 'cost optimization', 'cloud cost', 'ai spend'] },
  { term: 'total cost of ownership', category: 'economics', aka: ['tco'] },
  { term: 'AI ROI', category: 'economics', keyword: true, aka: ['return on investment', 'payback period', 'roi'] },
  { term: 'gross margin impact', category: 'economics', aka: ['gross margin', 'cogs', 'cost of goods sold', 'margin compression'] },
  { term: 'compute budget', category: 'economics', aka: ['gpu spend', 'capex', 'training budget'] },
  { term: 'token budget', category: 'economics', aka: ['context budget', 'rate limits', 'quota'] },

  // --- Agents & orchestration ---------------------------------------------
  { term: 'AI agents', category: 'agents', keyword: true, aka: ['agent', 'agents', 'autonomous agents'] },
  { term: 'agentic AI', category: 'agents', keyword: true, aka: ['agentic', 'agentic workflows', 'agentic systems'] },
  { term: 'agent orchestration', category: 'agents', keyword: true, aka: ['orchestration', 'multi-agent', 'multi-agent systems'] },
  { term: 'agents in production', category: 'agents', keyword: true, aka: ['production agents'], note: 'agents on real workloads, not benchmarks' },
  { term: 'model context protocol', category: 'agents', keyword: true, aka: ['mcp', 'mcp server', 'mcp servers'], note: 'open standard for connecting models to tools/data' },
  { term: 'tool use', category: 'agents', aka: ['function calling', 'tool calling', 'tools'] },
  { term: 'human-in-the-loop', category: 'agents', aka: ['hitl', 'human oversight', 'approval workflow'] },
  { term: 'workflow automation', category: 'agents', aka: ['ai workflow', 'ai workflows', 'process automation'] },
  { term: 'computer use', category: 'agents', aka: ['browser agents', 'computer-using agents', 'gui agents'] },
  { term: 'planning and reasoning', category: 'agents', aka: ['reasoning', 'chain of thought', 'task decomposition'] },

  // --- Models & techniques ------------------------------------------------
  { term: 'generative AI', category: 'models', keyword: true, aka: ['genai', 'gen ai'] },
  { term: 'large language model', category: 'models', aka: ['llm', 'llms', 'foundation model', 'frontier model'] },
  { term: 'retrieval augmented generation', category: 'models', keyword: true, aka: ['rag', 'retrieval', 'grounding'] },
  { term: 'fine-tuning', category: 'models', keyword: true, aka: ['fine tuning', 'sft', 'instruction tuning', 'lora'] },
  { term: 'RLHF', category: 'models', aka: ['reinforcement learning from human feedback', 'preference tuning', 'rlaif'] },
  { term: 'model distillation', category: 'models', aka: ['distillation', 'small language model', 'slm', 'small models'] },
  { term: 'quantization', category: 'models', aka: ['model compression', 'int8', '4-bit'] },
  { term: 'context window', category: 'models', aka: ['long context', 'context length', 'context engineering'] },
  { term: 'embeddings', category: 'models', aka: ['vector embeddings', 'semantic search', 'vector database', 'vector db', 'pgvector'] },
  { term: 'prompt engineering', category: 'models', aka: ['prompting', 'system prompt', 'prompt design'] },
  { term: 'evals', category: 'models', keyword: true, aka: ['evaluation', 'eval harness', 'benchmarks', 'model evaluation'] },
  { term: 'reasoning models', category: 'models', aka: ['test-time compute', 'inference-time scaling', 'thinking models'] },
  { term: 'mixture of experts', category: 'models', aka: ['moe', 'sparse models'] },
  { term: 'multimodal', category: 'models', aka: ['multi-modal', 'vision', 'speech', 'voice'] },

  // --- Infra, inference & LLMOps ------------------------------------------
  { term: 'LLMOps', category: 'infra', keyword: true, aka: ['mlops', 'llm ops', 'ai ops', 'aiops'] },
  { term: 'inference', category: 'infra', aka: ['model serving', 'serving', 'inference engine', 'vllm'] },
  { term: 'GPU capacity', category: 'infra', aka: ['gpus', 'gpu', 'accelerators', 'h100', 'b200'] },
  { term: 'latency', category: 'infra', aka: ['time to first token', 'ttft', 'tail latency', 'p99'] },
  { term: 'throughput', category: 'infra', aka: ['tokens per second', 'qps', 'batching'] },
  { term: 'observability', category: 'infra', keyword: true, aka: ['tracing', 'ai observability', 'monitoring', 'logging'] },
  { term: 'model routing', category: 'infra', aka: ['routing', 'model gateway', 'fallback', 'cascade'] },
  { term: 'prompt caching', category: 'infra', aka: ['semantic caching', 'caching', 'kv cache'] },
  { term: 'model drift', category: 'infra', aka: ['drift', 'performance degradation', 'regression', 'silent regression'] },
  { term: 'AI gateway', category: 'infra', aka: ['llm gateway', 'llm proxy', 'api gateway'] },

  // --- Security, risk & governance ----------------------------------------
  { term: 'AI alignment', category: 'governance', keyword: true, aka: ['alignment', 'value alignment'] },
  { term: 'shadow AI', category: 'governance', keyword: true, aka: ['shadow ai usage', 'unsanctioned ai', 'byo ai', 'rogue ai'], note: 'employees using AI tools outside IT approval' },
  { term: 'AI governance', category: 'governance', keyword: true, aka: ['governance', 'model governance', 'ai oversight'] },
  { term: 'prompt injection', category: 'governance', keyword: true, aka: ['injection', 'indirect prompt injection', 'jailbreak', 'jailbreaks'] },
  { term: 'data exfiltration', category: 'governance', aka: ['data leakage', 'pii leakage', 'sensitive data exposure'] },
  { term: 'EU AI Act', category: 'governance', keyword: true, aka: ['ai act', 'ai regulation', 'regulation', 'compliance'] },
  { term: 'red teaming', category: 'governance', aka: ['red team', 'adversarial testing', 'ai security testing'] },
  { term: 'guardrails', category: 'governance', aka: ['safety filters', 'content moderation', 'controls', 'policy enforcement'] },
  { term: 'hallucination', category: 'governance', aka: ['hallucinations', 'faithfulness', 'groundedness', 'confabulation'] },
  { term: 'responsible AI', category: 'governance', aka: ['ethical ai', 'trustworthy ai', 'ai ethics'] },
  { term: 'AI risk management', category: 'governance', aka: ['ai risk', 'nist ai rmf', 'risk framework'] },
  { term: 'model provenance', category: 'governance', aka: ['ai bill of materials', 'ai-bom', 'supply chain', 'data lineage'] },
  { term: 'data residency', category: 'governance', aka: ['data sovereignty', 'sovereignty', 'on-prem', 'private deployment'] },

  // --- Org, talent & adoption ---------------------------------------------
  { term: 'AI adoption', category: 'org', keyword: true, aka: ['adoption curve', 'rollout', 'enablement'] },
  { term: 'developer productivity', category: 'org', keyword: true, aka: ['developer velocity', 'ai coding', 'code generation', 'copilot'] },
  { term: 'AI fluency', category: 'org', aka: ['ai literacy', 'upskilling', 'reskilling'] },
  { term: 'change management', category: 'org', aka: ['organizational change', 'culture change', 'adoption resistance'] },
  { term: 'future of work', category: 'org', aka: ['workforce', 'job displacement', 'augmentation', 'headcount'] },
  { term: 'AI talent', category: 'org', aka: ['hiring', 'ml engineers', 'ai team', 'talent war'] },

  // --- Market, providers & compute ----------------------------------------
  { term: 'foundation model providers', category: 'market', aka: ['model providers', 'openai', 'anthropic', 'claude', 'gpt', 'gemini'] },
  { term: 'frontier models', category: 'market', aka: ['frontier ai', 'frontier lab', 'state of the art', 'sota'] },
  { term: 'open-weight models', category: 'market', aka: ['open source ai', 'open models', 'llama', 'mistral', 'open weights', 'deepseek'] },
  { term: 'model commoditization', category: 'market', aka: ['commoditization', 'price war', 'race to the bottom'] },
  { term: 'inference providers', category: 'market', aka: ['api providers', 'model api', 'serverless inference', 'together', 'fireworks'] },
  { term: 'hyperscalers', category: 'market', aka: ['cloud providers', 'aws', 'azure', 'gcp'] },
  { term: 'compute supply', category: 'market', aka: ['chips', 'nvidia', 'tpus', 'compute constraints', 'gpu shortage'] },
  { term: 'AI investment', category: 'market', aka: ['ai spending', 'capex', 'funding', 'venture capital', 'vc'] },
  { term: 'AI bubble', category: 'market', aka: ['hype cycle', 'hype', 'overhang', 'ai winter'] },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Every term tagged as a default ranking keyword. */
export function defaultKeywords() {
  return TERMS.filter((t) => t.keyword).map((t) => t.term);
}

/** All searchable strings for an entry, lowercased. */
function haystack(t) {
  return [t.term, t.category, CATEGORIES[t.category] || '', t.note || '', ...(t.aka || [])]
    .join('  ')
    .toLowerCase();
}

/**
 * Search the term library. Multi-word queries are AND-matched. Empty query
 * returns everything. Ranked: exact term > starts-with > contains > alias/note.
 */
export function searchTerms(query = '') {
  const q = query.trim().toLowerCase();
  if (!q) return [...TERMS];

  const words = q.split(/\s+/).filter(Boolean);
  const scored = [];
  for (const t of TERMS) {
    const hay = haystack(t);
    if (!words.every((w) => hay.includes(w))) continue;
    const term = t.term.toLowerCase();
    let score = 1;
    if (term.includes(q)) score = 2;
    if (term.startsWith(q)) score = 3;
    if (term === q) score = 4;
    scored.push({ t, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.t.term.localeCompare(b.t.term))
    .map((s) => s.t);
}

/** Group a list of terms by category, preserving CATEGORIES order. */
export function groupByCategory(terms) {
  const groups = new Map();
  for (const key of Object.keys(CATEGORIES)) groups.set(key, []);
  for (const t of terms) {
    if (!groups.has(t.category)) groups.set(t.category, []);
    groups.get(t.category).push(t);
  }
  return [...groups.entries()].filter(([, list]) => list.length > 0);
}
