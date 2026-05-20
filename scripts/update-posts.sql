-- 更新第一篇文章，末尾加项目地址
UPDATE posts SET content_md = content_md || '

---

## 项目地址

📦 GitHub：[https://github.com/zhaoxuya520/AI-Full-stack-Delivery-Workflow](https://github.com/zhaoxuya520/AI-Full-stack-Delivery-Workflow)

欢迎 Star、Fork、提 Issue。
', updated_at = unixepoch() * 1000
WHERE slug = 'ai-fullstack-delivery-workflow';

-- 插入第二篇文章：逆向渗透工作流
INSERT OR REPLACE INTO posts (id, slug, title, excerpt, tags_json, cover_url, content_md, created_at, updated_at)
VALUES (
  'p_reverse_pentest_001',
  'reverse-pentest-workflow',
  '逆向与渗透测试工作流：从方法论到实战的完整体系',
  '14 个技能模块 + 40 余个 CTF 子技能，覆盖信息收集、漏洞发现、漏洞利用、权限维持到报告输出的完整渗透链路。',
  '["安全","逆向","渗透测试","CTF"]',
  '',
  '# 逆向与渗透测试工作流：从方法论到实战的完整体系

> 不是零散的工具清单，而是一套可重复执行的安全攻防流程。

## 为什么需要一套工作流

做渗透测试时，最常见的问题：

- 拿到目标不知道从哪下手
- 信息收集做了一半就跑去试漏洞
- 找到漏洞但利用链不完整
- 打完了没有结构化记录，下次还得从头来

这些都是**流程缺失**的表现。工具再多，没有方法论串起来，效率就是低的。

所以我把渗透测试的完整链路，从信息收集到报告输出，整理成了一套结构化的工作流系统。

## 14 个核心技能模块

| 模块 | 覆盖内容 |
|------|---------|
| 信息收集 | 子域名枚举、端口扫描、指纹识别、目录爆破 |
| OSINT | 社工信息、邮箱收集、历史数据挖掘 |
| Web 渗透 | SQL 注入、XSS、SSRF、文件上传、反序列化 |
| 认证绕过 | 弱口令、JWT 攻击、Session 固定、OAuth 滥用 |
| 权限提升 | Linux 提权、Windows 提权、内核漏洞 |
| 横向移动 | Pass-the-Hash、Kerberoasting、RDP 劫持 |
| 持久化 | Webshell、计划任务、注册表后门 |
| 逆向工程 | 静态分析、动态调试、脱壳、协议逆向 |
| 二进制利用 | 栈溢出、堆利用、ROP、格式化字符串 |
| 密码学 | 弱加密识别、Padding Oracle、哈希碰撞 |
| 流量分析 | Wireshark、协议重放、中间人 |
| 移动安全 | APK 逆向、Hook、证书绕过 |
| 社会工程 | 钓鱼、Pretexting、物理渗透 |
| 报告输出 | 漏洞评级、PoC 编写、修复建议 |

## 40+ CTF 子技能

每个模块下都细分了 CTF 场景化的子技能，比如：

**Web 方向：**
- SQL 注入：联合注入、盲注（布尔/时间）、堆叠查询、二次注入
- XSS：反射型、存储型、DOM 型、CSP 绕过
- SSRF：gopher 协议利用、DNS rebinding、云元数据读取
- 文件上传：后缀绕过、Content-Type 伪造、.htaccess 利用

**Pwn 方向：**
- 栈溢出：ret2text、ret2shellcode、ret2libc、ROP chain
- 堆利用：UAF、Double Free、Fastbin Attack、House of 系列
- 格式化字符串：任意读写、GOT 覆写

**Crypto 方向：**
- RSA：小指数攻击、共模攻击、Wiener 攻击、Coppersmith
- AES：ECB 模式攻击、CBC 翻转、Padding Oracle
- 哈希：长度扩展攻击、彩虹表

**Misc/Forensics：**
- 流量分析、隐写术、内存取证、磁盘取证

## 标准执行链路

每次渗透任务都走同一条流水线：

```text
范围确认 → 信息收集 → 漏洞发现 → 漏洞验证
→ 漏洞利用 → 权限提升 → 横向移动 → 持久化
→ 数据收集 → 清理痕迹 → 报告输出
```

### 每个阶段的输入和输出

- **信息收集** → 输出：资产清单、技术栈、暴露面
- **漏洞发现** → 输出：潜在漏洞列表（含置信度）
- **漏洞利用** → 输出：PoC、截图、利用链
- **报告输出** → 输出：结构化报告（CVSS 评分 + 修复建议）

## 核心原则

```text
✅ 先收集，后利用 — 不跳步
✅ 每个发现都记录 — 不凭记忆
✅ 利用前先快照/备份 — 可回滚
✅ 所有操作有授权 — 不越界
✅ 报告要给修复方案 — 不只挖洞
❌ 不做未授权测试
❌ 不破坏业务数据
❌ 不留永久后门
❌ 不泄露漏洞细节（未修复前）
```

## 工具链（不完整列举）

**信息收集：** subfinder / httpx / naabu / nuclei / ffuf / waybackurls

**Web 渗透：** Burp Suite / sqlmap / XSStrike / dirsearch

**逆向：** IDA Pro / Ghidra / x64dbg / frida

**Pwn：** pwntools / ROPgadget / one_gadget / gdb-peda

**提权：** LinPEAS / WinPEAS / GTFOBins / PowerUp

**流量：** Wireshark / tcpdump / mitmproxy

## 经验沉淀

和全栈工作流一样，每次任务完成后都会回写 `field-journal/`：

- 遇到的坑
- 绕过方式
- 工具配置
- 新学到的技巧

这些经验在下一次同类任务时会被自动检索，避免重复踩坑。

## 和全栈工作流的关系

逆向渗透工作流是 [AI 全栈交付工作流](https://github.com/zhaoxuya520/AI-Full-stack-Delivery-Workflow) 的一个子工作流。在完整的项目交付中，它通常被这样调用：

```text
安全检查：
  安全工程师（威胁建模）
  → 逆向/渗透（漏洞挖掘）
  → 后端/前端（修复）
  → QA（回归测试）
  → DevOps（部署修复）
```

## 下一步

- 加入自动化扫描流水线（nuclei + 自定义模板）
- CTF 靶场自动化环境搭建
- 漏洞知识库的结构化索引

---

## 项目地址

📦 GitHub：[https://github.com/zhaoxuya520/reverse-pentest-workflow](https://github.com/zhaoxuya520/reverse-pentest-workflow)

欢迎 Star、Fork、提 Issue。如果你也在学安全，欢迎一起交流。
',
  (unixepoch() - 3600) * 1000,
  unixepoch() * 1000
);
