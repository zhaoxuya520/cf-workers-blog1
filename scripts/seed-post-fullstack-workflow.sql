-- 插入测试文章：AI 全栈交付工作流介绍
INSERT OR REPLACE INTO posts (id, slug, title, excerpt, tags_json, cover_url, content_md, created_at, updated_at)
VALUES (
  'p_ai_fullstack_workflow_001',
  'ai-fullstack-delivery-workflow',
  'AI 全栈交付工作流：把"项目交付"做成可复用的系统',
  '一个面向完整软件交付的 AI 集合工作流总控系统：17 个技术岗位工作流、100+ 技能模块，覆盖从产品设计到部署运维的全链路。',
  '["AI","工作流","全栈","方法论"]',
  '',
  '# AI 全栈交付工作流：把"项目交付"做成可复用的系统

> 一个 AI 在 17 个技术岗位间自由切换、自动路由、自我进化的工作流总控。

## 为什么要做这件事

我在用 AI 做项目时，遇到一个很现实的问题：

**AI 很聪明，但每次接到任务都像第一次工作。**

- 写前端时不会主动想"是否需要先和 API 设计对齐"
- 写后端时不会查"这个项目过去踩过哪些坑"
- 部署时不会回头看"测试有没有覆盖到关键路径"

这不是模型能力不够，而是**缺一个"流程总控"**。

于是我把整个软件交付生命周期拆成了 17 个岗位，每个岗位独立成一个工作流，再用一个总控负责识别任务、路由、调度、验收和经验沉淀。

## 总体架构

```text
AI Full-stack Delivery Workflow
├─ README.md          # 项目入口
├─ WORKFLOW.md        # 完整生命周期说明
├─ routing.md         # 总控路由规则
├─ RULES.md           # 全局执行硬规则
├─ EVOLUTION.md       # 自进化协议
├─ workflow-map.md    # 工作流协作关系
├─ workflows/         # 17 个岗位工作流集合
├─ templates/         # 输入、验收、报告模板
└─ field-journal/     # 经验沉淀
```

## 17 个岗位工作流

| 工作流 | Skills | 能干什么 |
|--------|--------|---------|
| 产品经理 | 12 skills | 需求分析、用户故事、PRD |
| 项目经理 | 12 skills | 任务拆分、风险识别、进度管控 |
| UI/UX 设计 | 14 skills | 设计系统、原型、交互动效 |
| API 设计 | 10 skills | RESTful、OpenAPI、契约设计 |
| 前端工程师 | 10 skills | 组件、状态管理、性能优化 |
| 后端工程师 | 10 skills | 服务端、数据访问、领域建模 |
| 全栈工程师 | 6 skills | BFF、SSR、端到端开发 |
| 数据库工程师 | 6 skills | 表结构、索引、迁移 |
| 测试工程师 | 12 skills | 单元、集成、E2E |
| 自动化测试 | 5 skills | CI 测试、回归 |
| DevOps | 8 skills | 容器化、CI/CD、IaC |
| SRE/运维 | 6 skills | 监控、告警、SLO |
| 安全工程师 | 5 skills | 威胁建模、安全编码 |
| 逆向/渗透 | 14 模块 + 40+ CTF | 漏洞挖掘、渗透测试 |
| 数据分析 | 5 skills | 指标体系、报表、洞察 |
| AI 集成 | 5 skills | LLM 接入、RAG、Prompt 工程 |
| 技术文档 | 5 skills | API 文档、README、Changelog |

## 标准执行链路

每个任务都走同一条流水线：

```text
Input → Classify → Route → Execute → Verify → Document → Learn
```

1. 接收任务输入
2. 判断类型，识别缺失材料
3. 按 `routing.md` 路由到对应岗位
4. 读取该岗位 `WORKFLOW.md`
5. 检查工具、环境、上下文
6. 执行（设计 / 开发 / 测试 / 部署 / 安全验证）
7. 按验收标准 checklist 验收
8. 生成文档或报告
9. 触发自进化检查
10. 回写 `field-journal/`，必要时更新 routing/tool-index/pitfalls

## 关键设计决策

### 1. 任务路由前必须先判断输入完整性

**坏的做法：** 用户说"帮我做个登录页"，AI 直接开始写代码。

**好的做法：** 先检查 — 有没有设计稿？有没有 API？有没有验证规则？任何一项缺失，先补问，不要猜。

### 2. 工具状态必须从 tool-index 读，不能猜

每个工作流目录下都有：

- `tool-index.md`（人可读）
- `tool-index.json`（机器可读）

AI 执行任务前，先读 tool-index 确认工具版本和状态，缺工具就自动调用 `bootstrap-project.ps1` 安装。

### 3. 失败两次必须换路径

设了一个硬规则：**同一种解法失败 2 次，必须停下来重新评估**，而不是继续打补丁。

### 4. 经验必须沉淀到 field-journal

每次任务完成（哪怕失败），都要回写经验：

```text
field-journal/
├─ ai/
├─ backend/
├─ frontend/
├─ qa/
├─ security/
├─ sre/
└─ ...
```

下一次同类型任务，AI 会先查 field-journal 复用已有经验，而不是重头开始。

## 多工作流协同

单任务只进一个工作流。**跨层任务按生命周期顺序串联**：

```text
新功能开发：
  产品经理 → 项目经理 → UI/UX → API 设计 → 数据库
  → 后端 → 前端 → QA → DevOps → 文档

Bug 修复：
  QA → 前端/后端 → 自动化测试 → DevOps

安全检查：
  安全工程师 → 逆向/渗透 → 后端/前端修复 → QA 回归 → DevOps

AI 功能集成：
  产品经理 → AI 集成工程师 → 后端 → 前端 → QA
```

## 禁止行为（硬规则）

```text
❌ 跳过 routing.md 直接猜工作流
❌ 输入不足时直接开始执行
❌ 猜测工具路径或版本号
❌ 跳过 field-journal 查询
❌ 任务完成后跳过验收和经验沉淀
❌ 同一条路失败 2 次还继续
❌ 沉默 — 遇到问题必须立即告知用户
❌ 未授权执行安全/渗透操作
❌ 硬编码密钥、Token、密码
❌ 跳过 Code Review
```

## 收益

用了一段时间后，最明显的变化：

- **不再重复犯同一个错误** — field-journal 会拦下来
- **任务前置准备更完整** — 路由阶段就把缺失材料补齐
- **AI 在不同岗位间切换不再"失忆"** — 每个工作流都有完整上下文
- **经验是可继承资产** — 不只属于某次对话

## 下一步

接下来想做的：

- 把 field-journal 的经验自动总结成 weekly digest
- 加入更多专项工作流（比如机器学习实验流水线）
- 跨项目的经验迁移机制

如果你也在用 AI 做工程，欢迎交流这套思路。仓库地址在 GitHub。
',
  unixepoch() * 1000,
  unixepoch() * 1000
);
