// Exhaustive preload bridge wiring test. The preload is the ONLY place the renderer-facing
// argument order and the channel names are glued to ipcRenderer, and a swap or a renamed
// channel here could be green under every logic test while breaking the live dialog/nodes
// (the existing sshProject passphrase test already guards one surface). This file walks the
// WHOLE bridge so a mistyped channel or an argument-order swap on ANY namespace fails CI.
// electron is mocked (a preload script cannot run outside Electron); the assertion target is
// the exact invoke/send/on/removeListener wiring the real contextBridge would expose.
//
// Routing tests call through a LOOSE surface on purpose: the payload shapes are the
// renderer's contract with NodeTerminalApi (enforced at renderer call sites); here we assert
// the channel and the arg-forwarding, so full fixture payloads would add nothing but noise.
// Where the preload has REAL logic (speech PCM buffer handling, getPathForFile), the test
// uses the typed api directly.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IPC } from '../shared/ipc'
import type { NodeTerminalApi } from '../shared/types'

const h = vi.hoisted(() => ({
  invoke: vi.fn(async (..._args: unknown[]) => undefined),
  send: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  getPathForFile: vi.fn((f: unknown) => `/path/${(f as { name?: string }).name ?? 'file'}`),
  exposed: {} as Record<string, unknown>
}))

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: (key: string, value: unknown) => {
      h.exposed[key] = value
    }
  },
  ipcRenderer: {
    invoke: h.invoke,
    send: h.send,
    on: h.on,
    removeListener: h.removeListener
  },
  webUtils: { getPathForFile: h.getPathForFile }
}))

// Side-effect import: runs the preload script, which exposes the api through the mock above.
import './index'

const api = h.exposed.nodeTerminal as NodeTerminalApi
// Loose call surface for pure-routing assertions (see header comment). Deliberately untyped:
// the wiring forwards args verbatim, so the only thing asserted here is channel + arg order.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const route = api as unknown as { [k: string]: any }

// Track how many times each channel was registered with ipcRenderer.on (to prove the fan-out
// helper multiplexes many renderer subscribers onto ONE native listener).
function onCount(channel: string): number {
  return h.on.mock.calls.filter((c) => c[0] === channel).length
}

// Invoke the ipcRenderer.on handler registered for a channel, like main firing an event.
function fire(channel: string, ...payload: unknown[]) {
  const call = h.on.mock.calls.find((c) => c[0] === channel)
  expect(call, `no listener registered for ${channel}`).toBeTruthy()
  ;(call![1] as (e: unknown, ...args: unknown[]) => void)({}, ...payload)
}

beforeEach(() => {
  h.invoke.mockClear()
  h.send.mockClear()
  h.on.mockClear()
  h.removeListener.mockClear()
  h.getPathForFile.mockClear()
})

describe('preload pty', () => {
  it('creates a pty via invoke with the create options', async () => {
    const opts = { cols: 100, rows: 40, cwd: '/tmp', name: 'x' }
    await route.pty.create(opts)
    expect(h.invoke).toHaveBeenCalledWith(IPC.ptyCreate, opts)
  })

  it('sends write/resize/flow/kill/destroy/recycle on their exact channels in exact arg order', () => {
    route.pty.write('s1', 'data')
    expect(h.send).toHaveBeenCalledWith(IPC.ptyWrite, 's1', 'data')
    route.pty.resize('s1', 100, 40, 'v1')
    expect(h.send).toHaveBeenCalledWith(IPC.ptyResize, 's1', 100, 40, 'v1')
    route.pty.setFlow('s1', true, 'v1')
    expect(h.send).toHaveBeenCalledWith(IPC.ptyFlow, 's1', true, 'v1')
    route.pty.kill('s1', 'v1')
    expect(h.send).toHaveBeenCalledWith(IPC.ptyKill, 's1', 'v1')
    route.pty.destroy('k')
    expect(h.send).toHaveBeenCalledWith(IPC.ptyDestroy, 'k')
    route.pty.recycle('k')
    expect(h.send).toHaveBeenCalledWith(IPC.ptyRecycle, 'k')
  })

  it('invokes name/capture/read/sendText/tmux-query helpers with their args', async () => {
    await route.pty.generateName('k', '/tmp')
    expect(h.invoke).toHaveBeenCalledWith(IPC.ptyGenerateName, 'k', '/tmp')
    await route.pty.generateGroupName(['a', 'b'], '/tmp')
    expect(h.invoke).toHaveBeenCalledWith(IPC.ptyGenerateGroupName, ['a', 'b'], '/tmp')
    await route.pty.capture('k', true)
    expect(h.invoke).toHaveBeenCalledWith(IPC.ptyCapture, 'k', true)
    await route.pty.readScrollback('k')
    expect(h.invoke).toHaveBeenCalledWith(IPC.ptyReadScrollback, 'k')
    await route.pty.sendText('k', 'echo hi', { enter: true })
    expect(h.invoke).toHaveBeenCalledWith(IPC.ptySendText, 'k', 'echo hi', true)
    await route.pty.tmuxStatus()
    expect(h.invoke).toHaveBeenCalledWith(IPC.ptyTmuxStatus)
    await route.pty.paneCommand('k')
    expect(h.invoke).toHaveBeenCalledWith(IPC.ptyPaneCommand, 'k')
    await route.pty.readSessionName('s1', 'acc', 'agt')
    expect(h.invoke).toHaveBeenCalledWith(IPC.ptyReadSessionName, 's1', 'acc', 'agt')
  })

  it('forwards lack of sendText opts (enter) as undefined, not true', async () => {
    await route.pty.sendText('k', 'echo hi')
    expect(h.invoke).toHaveBeenCalledWith(IPC.ptySendText, 'k', 'echo hi', undefined)
  })

  it('binds per-session event channels and forwards payloads, unsubscribing the same handler', () => {
    const onData: string[] = []
    route.pty.onData('s1', (d: string) => onData.push(d))
    const exitCode: number[] = []
    route.pty.onExit('s1', (c: number) => exitCode.push(c))
    const sizes: Array<{ cols: number; rows: number }> = []
    route.pty.onSize('s1', (s: { cols: number; rows: number }) => sizes.push(s))
    const closed: Array<{ by: string | null }> = []
    route.pty.onClosed('s1', (i: { by: string | null }) => closed.push(i))
    const recycled: Array<{ ready: boolean }> = []
    route.pty.onRecycled('s1', (i: { ready: boolean }) => recycled.push(i))
    const screens: string[] = []
    route.pty.onResync('s1', (s: string) => screens.push(s))

    expect(h.on).toHaveBeenCalledWith(IPC.ptyData('s1'), expect.any(Function))
    expect(h.on).toHaveBeenCalledWith(IPC.ptyExit('s1'), expect.any(Function))
    expect(h.on).toHaveBeenCalledWith(IPC.ptySize('s1'), expect.any(Function))
    expect(h.on).toHaveBeenCalledWith(IPC.ptyClosed('s1'), expect.any(Function))
    expect(h.on).toHaveBeenCalledWith(IPC.ptyRecycled('s1'), expect.any(Function))
    expect(h.on).toHaveBeenCalledWith(IPC.ptyResync('s1'), expect.any(Function))

    fire(IPC.ptyData('s1'), 'screen text')
    fire(IPC.ptyExit('s1'), 0)
    fire(IPC.ptySize('s1'), { cols: 120, rows: 50 })
    fire(IPC.ptyClosed('s1'), { by: 'peer1' })
    fire(IPC.ptyRecycled('s1'), { ready: true })
    fire(IPC.ptyResync('s1'), 'full screen')

    expect(onData).toEqual(['screen text'])
    expect(exitCode).toEqual([0])
    expect(sizes).toEqual([{ cols: 120, rows: 50 }])
    expect(closed).toEqual([{ by: 'peer1' }])
    expect(recycled).toEqual([{ ready: true }])
    expect(screens).toEqual(['full screen'])
  })

  it('per-session onData unsubscribe removes the identical handler', () => {
    const unsub = route.pty.onData('s2', () => {})
    const call = h.on.mock.calls.find((c) => c[0] === IPC.ptyData('s2'))
    expect(call).toBeTruthy()
    unsub()
    expect(h.removeListener).toHaveBeenCalledWith(IPC.ptyData('s2'), call![1])
  })
})

describe('preload workspace / dialog / settings', () => {
  it('invokes workspace load/save/probe on their channels', async () => {
    const ws = { projects: [], version: 2, activeProjectId: '' }
    await route.workspace.load()
    expect(h.invoke).toHaveBeenCalledWith(IPC.workspaceLoad)
    await route.workspace.save(ws)
    expect(h.invoke).toHaveBeenCalledWith(IPC.workspaceSave, ws)
    await route.workspace.probeFolder('/p')
    expect(h.invoke).toHaveBeenCalledWith(IPC.workspaceProbeFolder, '/p')
  })

  it('workspace migration/recovery/external-change events wire their channels and default migrated kind', () => {
    const migrated: string[] = []
    const recovered: string[] = []
    const changed: unknown[] = []
    route.workspace.onMigrated((k: string) => migrated.push(k))
    route.workspace.onCorruptRecovered((b: string) => recovered.push(b))
    route.workspace.onExternalChange((p: unknown) => changed.push(p))
    fire(IPC.workspaceMigrated, 'v3')
    fire(IPC.workspaceMigrated) // no payload -> defaults 'v2'
    fire(IPC.workspaceCorruptRecovered, 'workspace.json.corrupt-123')
    fire(IPC.workspaceExternalChange, { id: 'p1' })
    expect(migrated).toEqual(['v3', 'v2'])
    expect(recovered).toEqual(['workspace.json.corrupt-123'])
    expect(changed).toEqual([{ id: 'p1' }])
  })

  it('dialog and settings are simple invokes', async () => {
    await route.dialog.selectFolder()
    expect(h.invoke).toHaveBeenCalledWith(IPC.dialogSelectFolder)
    await route.dialog.selectFile()
    expect(h.invoke).toHaveBeenCalledWith(IPC.dialogSelectFile)
    const settings = { theme: 'dark' }
    await route.settings.save(settings)
    expect(h.invoke).toHaveBeenCalledWith(IPC.settingsSave, settings)
    await route.settings.load()
    expect(h.invoke).toHaveBeenCalledWith(IPC.settingsLoad)
  })
})

describe('preload github', () => {
  it('routes githubIssues request/refresh/etc on their exact channels', async () => {
    const request = { projectId: 'p1', columnId: null, pageSize: 50 }
    await route.githubIssues.subscribe('p1')
    expect(h.invoke).toHaveBeenCalledWith(IPC.githubIssuesSubscribe, { projectId: 'p1' })
    await route.githubIssues.unsubscribe('p1')
    expect(h.send).toHaveBeenCalledWith(IPC.githubIssuesUnsubscribe, 'p1')
    await route.githubIssues.query(request)
    expect(h.invoke).toHaveBeenCalledWith(IPC.githubIssuesQuery, request)
    await route.githubIssues.refresh('p1', true)
    expect(h.invoke).toHaveBeenCalledWith(IPC.githubIssuesRefresh, 'p1', true)
    await route.githubIssues.moveIssue(request)
    expect(h.invoke).toHaveBeenCalledWith(IPC.githubIssuesMove, request)
    await route.githubIssues.createMissingLabels('p1')
    expect(h.invoke).toHaveBeenCalledWith(IPC.githubIssuesCreateLabels, 'p1')
    await route.githubIssues.clearCache('p1')
    expect(h.invoke).toHaveBeenCalledWith(IPC.githubIssuesClearCache, 'p1')
  })

  it('githubIssues per-project changed event is a channel-bound subscription', () => {
    const got: number[][] = []
    route.githubIssues.onChanged('p1', (n: number[]) => got.push(n))
    fire(IPC.githubIssuesChanged('p1'), [1, 2, 3])
    expect(got).toEqual([[1, 2, 3]])
  })

  it('githubControl methods invoke their channels', async () => {
    await route.githubControl.status('p1')
    expect(h.invoke).toHaveBeenCalledWith(IPC.githubControlStatus, 'p1')
    await route.githubControl.approve({ projectId: 'p1', oid: 'a' })
    expect(h.invoke).toHaveBeenCalledWith(IPC.githubControlApprove, { projectId: 'p1', oid: 'a' })
    await route.githubControl.revoke({ projectId: 'p1' })
    expect(h.invoke).toHaveBeenCalledWith(IPC.githubControlRevoke, { projectId: 'p1' })
    await route.githubControl.selectProvider({ projectId: 'p1', provider: 'x' })
    expect(h.invoke).toHaveBeenCalledWith(IPC.githubControlSelectProvider, {
      projectId: 'p1',
      provider: 'x'
    })
    await route.githubControl.saveToken('tok')
    expect(h.invoke).toHaveBeenCalledWith(IPC.githubControlSaveToken, 'tok')
    await route.githubControl.clearToken()
    expect(h.invoke).toHaveBeenCalledWith(IPC.githubControlClearToken)
  })
})

describe('preload speech', () => {
  it('sends an exactly-spanning Float32Array as its underlying buffer', async () => {
    const pcm = new Float32Array([0.1, 0.2, 0.3])
    await api.speech.transcribe(pcm, 'en')
    expect(h.invoke).toHaveBeenCalledWith(IPC.speechTranscribe, { pcm: pcm.buffer, language: 'en' })
  })

  it('copies a non-spanning Float32Array view before sending its buffer (no neighboring-buffer leak)', async () => {
    const pool = new Float32Array([1, 2, 3, 4, 5])
    const slice = pool.subarray(1, 4) // byteOffset 4, byteLength 12 < underlying 20
    await api.speech.transcribe(slice)
    const call = h.invoke.mock.calls.find((c) => c[0] === IPC.speechTranscribe)!
    const arg = call[1] as { pcm: ArrayBuffer }
    // The copy must be exactly the view's length, not the pooled buffer's.
    expect(arg.pcm.byteLength).toBe(12)
    expect(new Float32Array(arg.pcm)).toEqual(new Float32Array([2, 3, 4]))
  })

  it('models/download/delete/progress/micConsent route correctly', async () => {
    await route.speech.models()
    expect(h.invoke).toHaveBeenCalledWith(IPC.speechModels)
    await route.speech.downloadModel('m1')
    expect(h.invoke).toHaveBeenCalledWith(IPC.speechModelDownload, { id: 'm1' })
    await route.speech.deleteModel('m1')
    expect(h.invoke).toHaveBeenCalledWith(IPC.speechModelDelete, { id: 'm1' })
    const got: Array<{ id: string; pct: number }> = []
    route.speech.onProgress((p: { id: string; pct: number }) => got.push(p))
    fire(IPC.speechProgress, { id: 'w', pct: 50 })
    expect(got).toEqual([{ id: 'w', pct: 50 }])
    await route.speech.micConsent()
    expect(h.invoke).toHaveBeenCalledWith(IPC.speechMicConsent)
  })
})

describe('preload ssh', () => {
  it('routes ssh list/save/remove/import on their channels', async () => {
    await route.ssh.list()
    expect(h.invoke).toHaveBeenCalledWith(IPC.sshList)
    const server = { id: 1, label: 'x', host: 'h', user: 'u' }
    await route.ssh.save(server)
    expect(h.invoke).toHaveBeenCalledWith(IPC.sshSave, server)
    await route.ssh.remove('2')
    expect(h.invoke).toHaveBeenCalledWith(IPC.sshDelete, '2')
    await route.ssh.importCandidates()
    expect(h.invoke).toHaveBeenCalledWith(IPC.sshImport)
  })

  it('routes sshProject connect/disconnect/killSessions/fs ops on their channels', async () => {
    await route.sshProject.connect('p1', { host: 'h', user: 'u' }, '/cwd')
    expect(h.invoke).toHaveBeenCalledWith(IPC.sshConnectProject, 'p1', { host: 'h', user: 'u' }, '/cwd')
    await route.sshProject.disconnect('p1')
    expect(h.invoke).toHaveBeenCalledWith(IPC.sshDisconnectProject, 'p1')
    await route.sshProject.killSessions('p1', ['n1'])
    expect(h.invoke).toHaveBeenCalledWith(IPC.sshKillSessions, 'p1', ['n1'])
    await route.sshProject.listDir('p1', '/d')
    expect(h.invoke).toHaveBeenCalledWith(IPC.sshListDir, 'p1', '/d')
    await route.sshProject.mkdir('p1', '/d')
    expect(h.invoke).toHaveBeenCalledWith(IPC.sshMkdir, 'p1', '/d')
    await route.sshProject.uploadFile('p1', '/l', 'n.txt')
    expect(h.invoke).toHaveBeenCalledWith(IPC.sshUploadFile, 'p1', '/l', 'n.txt')
    await route.sshProject.downloadFile('p1', '/r', '/d')
    expect(h.invoke).toHaveBeenCalledWith(IPC.sshDownloadFile, 'p1', '/r', '/d')
  })

  it('sshProject status subscription wires the status channel and forwards events', () => {
    const got: unknown[] = []
    const unsub = route.sshProject.onStatus((e: unknown) => got.push(e))
    const call = h.on.mock.calls.find((c) => c[0] === IPC.sshProjectStatus)
    expect(call).toBeTruthy()
    ;(call![1] as (e: unknown, ev: unknown) => void)({}, { projectId: 'p1', connected: true })
    expect(got).toEqual([{ projectId: 'p1', connected: true }])
    unsub()
    expect(h.removeListener).toHaveBeenCalledWith(IPC.sshProjectStatus, call![1])
  })

  it('sshFs read/write/mkdir/exists route on their channels', async () => {
    await route.sshFs.list('p1', '/d')
    expect(h.invoke).toHaveBeenCalledWith(IPC.sshFsList, 'p1', '/d')
    await route.sshFs.read('p1', '/d/f')
    expect(h.invoke).toHaveBeenCalledWith(IPC.sshFsRead, 'p1', '/d/f')
    await route.sshFs.readBinary('p1', '/d/f')
    expect(h.invoke).toHaveBeenCalledWith(IPC.sshFsReadBinary, 'p1', '/d/f')
    await route.sshFs.write('p1', '/d/f', 'content')
    expect(h.invoke).toHaveBeenCalledWith(IPC.sshFsWrite, 'p1', '/d/f', 'content')
    await route.sshFs.mkdir('p1', '/d2')
    expect(h.invoke).toHaveBeenCalledWith(IPC.sshFsMkdir, 'p1', '/d2')
    await route.sshFs.exists('p1', '/d')
    expect(h.invoke).toHaveBeenCalledWith(IPC.sshFsExists, 'p1', '/d')
  })
})

describe('preload git', () => {
  it('routes the git invoke surface to its exact channels', async () => {
    await route.git.status('/r')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitStatus, '/r')
    await route.git.init('/r')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitInit, '/r')
    await route.git.clone('/par', 'url')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitClone, '/par', 'url')
    await route.git.cloneAbort()
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitCloneAbort)
    await route.git.cloneDefaultParent()
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitCloneDefaultParent)
    await route.git.commit('/r', 'msg')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitCommit, '/r', 'msg')
    await route.git.push('/r')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitPush, '/r')
    await route.git.pull('/r')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitPull, '/r')
    await route.git.sync('/r')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitSync, '/r')
    await route.git.publish('/r', 'name', true)
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitPublish, '/r', 'name', true)
    await route.git.stage('/r', ['a'])
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitStage, '/r', ['a'])
    await route.git.unstage('/r', ['a'])
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitUnstage, '/r', ['a'])
    await route.git.stageAll('/r')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitStageAll, '/r')
    await route.git.unstageAll('/r')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitUnstageAll, '/r')
    await route.git.diff('/r', 'f', true, false)
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitDiff, '/r', 'f', true, false)
    await route.git.discard('/r', 'f', true)
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitDiscard, '/r', 'f', true)
    await route.git.switchBranch('/r', 'b')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitSwitchBranch, '/r', 'b')
    await route.git.createBranch('/r', 'b')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitCreateBranch, '/r', 'b')
    await route.git.showFile('/r', 'ref', 'f')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitShowFile, '/r', 'ref', 'f')
    await route.git.generateMessage('/r')
    expect(h.invoke).toHaveBeenCalledWith(IPC.commitGenerate, '/r')
    await route.git.history('/r', { limit: 10 })
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitHistory, '/r', { limit: 10 })
    await route.git.commitFiles('/r', 'oid')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitCommitFiles, '/r', 'oid')
    await route.git.remoteCommitUrl('/r', 'sha')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitRemoteCommitUrl, '/r', 'sha')
    await route.git.merge('/r', 'ref')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitMerge, '/r', 'ref')
    await route.git.rebase('/r', 'onto')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitRebase, '/r', 'onto')
    await route.git.deleteBranch('/r', 'b', true)
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitDeleteBranch, '/r', 'b', true)
    await route.git.renameBranch('/r', 'nb')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitRenameBranch, '/r', 'nb')
    await route.git.fetch('/r')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitFetch, '/r')
    await route.git.forcePush('/r')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitForcePush, '/r')
    await route.git.stashPush('/r')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitStashPush, '/r')
    await route.git.stashPop('/r')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitStashPop, '/r')
    await route.git.revert('/r', 'oid')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitRevert, '/r', 'oid')
    await route.git.branchAt('/r', 'b', 'oid')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitBranchAt, '/r', 'b', 'oid')
    await route.git.checkoutCommit('/r', 'oid')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitCheckoutCommit, '/r', 'oid')
    await route.git.repoRoot('/r')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitRepoRoot, '/r')
    await route.git.worktreeList('/r')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitWorktreeList, '/r')
    await route.git.worktreeAdd('/r', '/wt', 'b', 'ref', true)
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitWorktreeAdd, '/r', '/wt', 'b', 'ref', true)
    await route.git.worktreeMerge('/r', 'b', 'ref', true)
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitWorktreeMerge, '/r', 'b', 'ref', true)
    await route.git.worktreeRemove('/r', '/wt', true, false)
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitWorktreeRemove, '/r', '/wt', true, false)
    await route.git.setActiveRemote('p1')
    expect(h.invoke).toHaveBeenCalledWith(IPC.gitSetActiveRemote, 'p1')
  })

  it('routes git clone progress as a subscription on the progress channel', () => {
    const got: Array<{ phase: string; percent: number }> = []
    route.git.onCloneProgress((p: { phase: string; percent: number }) => got.push(p))
    fire(IPC.gitCloneProgress, { phase: 'checkout', percent: 42 })
    expect(got).toEqual([{ phase: 'checkout', percent: 42 }])
  })
})

describe('preload shell / fs / clipboard / files / media / browser', () => {
  it('shell + clipboard route via send on their exact channels', () => {
    route.shell.reveal('/p')
    expect(h.send).toHaveBeenCalledWith(IPC.shellReveal, '/p')
    route.shell.openPath('/p')
    expect(h.send).toHaveBeenCalledWith(IPC.shellOpenPath, '/p')
    route.shell.openExternal('https://x')
    expect(h.send).toHaveBeenCalledWith(IPC.shellOpenExternal, 'https://x')
    route.clipboard.writeText('text')
    expect(h.send).toHaveBeenCalledWith(IPC.clipboardWrite, 'text')
  })

  it('routes fs invoke surface', async () => {
    await route.fs.list('/d')
    expect(h.invoke).toHaveBeenCalledWith(IPC.fsList, '/d')
    await route.fs.read('/d/f')
    expect(h.invoke).toHaveBeenCalledWith(IPC.fsRead, '/d/f')
    await route.fs.readBinary('/d/f')
    expect(h.invoke).toHaveBeenCalledWith(IPC.fsReadBinary, '/d/f')
    await route.fs.write('/d/f', 'c')
    expect(h.invoke).toHaveBeenCalledWith(IPC.fsWrite, '/d/f', 'c')
    await route.fs.mkdir('/d2')
    expect(h.invoke).toHaveBeenCalledWith(IPC.fsMkdir, '/d2')
    await route.fs.exists('/d')
    expect(h.invoke).toHaveBeenCalledWith(IPC.fsExists, '/d')
  })

  it('routes files/fs + media + browser channels', async () => {
    await route.files.quickOpen('/r')
    expect(h.invoke).toHaveBeenCalledWith(IPC.filesQuickOpen, '/r')
    await route.files.downloadTicket('/p')
    expect(h.invoke).toHaveBeenCalledWith(IPC.filesDownloadTicket, '/p')
    await route.files.saveUpload('n', 'b64')
    expect(h.invoke).toHaveBeenCalledWith(IPC.filesSaveUpload, 'n', 'b64')

    await route.media.allow('/abs')
    expect(h.invoke).toHaveBeenCalledWith(IPC.mediaAllow, '/abs')
    await route.media.allowSsh('p1', '/r')
    expect(h.invoke).toHaveBeenCalledWith(IPC.sshMediaAllow, 'p1', '/r')
    await route.media.writeHtml('<html/>')
    expect(h.invoke).toHaveBeenCalledWith(IPC.mediaWriteHtml, '<html/>')

    route.browser.register(12, 'n1')
    expect(h.send).toHaveBeenCalledWith(IPC.browserRegister, 12, 'n1')
    route.browser.unregister(12)
    expect(h.send).toHaveBeenCalledWith(IPC.browserUnregister, 12)
    const wins: Array<{ url: string; sourceNodeId: string }> = []
    route.browser.onBrowserNewWindow((e: { url: string; sourceNodeId: string }) => wins.push(e))
    fire(IPC.browserNewWindow, { url: 'u', sourceNodeId: 'n1' })
    expect(wins).toEqual([{ url: 'u', sourceNodeId: 'n1' }])
  })
})

describe('preload updates / license / announcements / usage / context', () => {
  it('routes updates invoke + send surface', async () => {
    await route.updates.getVersion()
    expect(h.invoke).toHaveBeenCalledWith(IPC.appGetVersion)
    await route.updates.getPolicy()
    expect(h.invoke).toHaveBeenCalledWith(IPC.appUpdatePolicy)
    route.updates.check()
    expect(h.send).toHaveBeenCalledWith(IPC.appCheckForUpdates)
    route.updates.restart()
    expect(h.send).toHaveBeenCalledWith(IPC.appRestartToUpdate)
  })

  it('routes updates event subscriptions to their exact channels', () => {
    const evs: string[] = []
    route.updates.onAvailable(() => evs.push('avail'))
    route.updates.onDownloaded(() => evs.push('downloaded'))
    route.updates.onProgress(() => evs.push('progress'))
    route.updates.onError(() => evs.push('error'))
    route.updates.onNotAvailable(() => evs.push('notavail'))
    expect(h.on).toHaveBeenCalledWith(IPC.appUpdateAvailable, expect.any(Function))
    expect(h.on).toHaveBeenCalledWith(IPC.appUpdateDownloaded, expect.any(Function))
    expect(h.on).toHaveBeenCalledWith(IPC.appUpdateProgress, expect.any(Function))
    expect(h.on).toHaveBeenCalledWith(IPC.appUpdateError, expect.any(Function))
    expect(h.on).toHaveBeenCalledWith(IPC.appUpdateNotAvailable, expect.any(Function))
    // onNotAvailable handler takes no payload arg — firing with none must not throw.
    expect(() => fire(IPC.appUpdateNotAvailable)).not.toThrow()
    // onAvailable forwards the UpdateInfo payload
    fire(IPC.appUpdateAvailable, { version: '9' })
    expect(evs).toContain('avail')
  })

  it('routes license surface', async () => {
    await route.license.upgrade('pro')
    expect(h.invoke).toHaveBeenCalledWith(IPC.licenseUpgrade, 'pro')
    await route.license.upgrade(undefined)
    expect(h.invoke).toHaveBeenCalledWith(IPC.licenseUpgrade, undefined)
    await route.license.activate('KEY')
    expect(h.invoke).toHaveBeenCalledWith(IPC.licenseActivate, 'KEY')
    await route.license.deactivate()
    expect(h.invoke).toHaveBeenCalledWith(IPC.licenseDeactivate)
    await route.license.getStatus()
    expect(h.invoke).toHaveBeenCalledWith(IPC.licenseStatus)
    const states: unknown[] = []
    route.license.onChange((s: unknown) => states.push(s))
    fire(IPC.licenseChanged, { active: true })
    expect(states).toEqual([{ active: true }])
  })

  it('routes announcements + usage invoke surface', async () => {
    await route.announcements.fetch()
    expect(h.invoke).toHaveBeenCalledWith(IPC.announcementsFetch)
    await route.usage.fetch('acc')
    expect(h.invoke).toHaveBeenCalledWith(IPC.usageFetch, 'acc')
    await route.usage.refresh('acc')
    expect(h.invoke).toHaveBeenCalledWith(IPC.usageRefresh, 'acc')
    await route.usage.providers(true)
    expect(h.invoke).toHaveBeenCalledWith(IPC.usageProviders, true)
    await route.usage.remote({ accountId: 'a' })
    expect(h.invoke).toHaveBeenCalledWith(IPC.usageRemote, { accountId: 'a' })
    await route.usage.setProviderCookie('minimax', 'cook')
    expect(h.invoke).toHaveBeenCalledWith(IPC.usageSetProviderCookie, 'minimax', 'cook')
    await route.usage.cookieProviders()
    expect(h.invoke).toHaveBeenCalledWith(IPC.usageCookieProviders)
    const updates: unknown[] = []
    route.usage.onUpdate((p: unknown) => updates.push(p))
    fire(IPC.usageUpdate, { result: 1 })
    expect(updates).toEqual([{ result: 1 }])
  })

  it('routes context update + ensure', () => {
    const updates: unknown[] = []
    route.context.onUpdate((p: unknown) => updates.push(p))
    fire(IPC.contextUpdate, { files: [] })
    expect(updates).toEqual([{ files: [] }])
    route.context.ensure('s1', '/cwd', 'acc')
    expect(h.send).toHaveBeenCalledWith(IPC.contextEnsure, 's1', '/cwd', 'acc')
  })
})

describe('preload canvas / claude / chat / accounts / transcripts', () => {
  it('canvas both directions on the single canvas:mut channel', () => {
    const mut = { type: 'add', id: 'n' }
    route.canvas.mutate('p1', mut)
    expect(h.send).toHaveBeenCalledWith(IPC.canvasMut, 'p1', mut)
    const seen: Array<{ projectId: string; mutation: unknown }> = []
    route.canvas.onMutation((projectId: string, mutation: unknown) => seen.push({ projectId, mutation }))
    fire(IPC.canvasMut, 'p1', mut)
    expect(seen).toEqual([{ projectId: 'p1', mutation: mut }])
  })

  it('claude + chat transcripts + claudeAccounts + transcript search route', async () => {
    await route.claude.cliCaps()
    expect(h.invoke).toHaveBeenCalledWith(IPC.claudeCliCaps)
    await route.claude.readTranscript('s1', '/cwd', 'acc', 'n1')
    expect(h.invoke).toHaveBeenCalledWith(IPC.claudeReadTranscript, 's1', '/cwd', 'acc', 'n1')
    await route.chat.readTranscript('s1', '/cwd', 'acc', 'n1')
    expect(h.invoke).toHaveBeenCalledWith(IPC.chatReadTranscript, 's1', '/cwd', 'acc', 'n1')
    await route.claudeAccounts.add({})
    expect(h.invoke).toHaveBeenCalledWith(IPC.claudeAccountsAdd, {})
    await route.claudeAccounts.waitLogin('id', {})
    expect(h.invoke).toHaveBeenCalledWith(IPC.claudeAccountsWaitLogin, 'id', {})
    await route.claudeAccounts.cancelWaitLogin('id')
    expect(h.invoke).toHaveBeenCalledWith(IPC.claudeAccountsCancelWait, 'id')
    await route.claudeAccounts.remove('id', {})
    expect(h.invoke).toHaveBeenCalledWith(IPC.claudeAccountsRemove, 'id', {})
    await route.transcripts.search('query')
    expect(h.invoke).toHaveBeenCalledWith(IPC.transcriptSearch, 'query')
  })
})

describe('preload relay / remote-host / presence / pairing / handoff / context-link / board-log', () => {
  it('remoteHost routes start/stop/approve/reject/phone-access and the two fan-out events', () => {
    route.remoteHost.start()
    expect(h.invoke).toHaveBeenCalledWith(IPC.remoteHostStart)
    route.remoteHost.stop()
    expect(h.invoke).toHaveBeenCalledWith(IPC.remoteHostStop)
    route.remoteHost.sendCanvasState({ nodes: [] })
    expect(h.send).toHaveBeenCalledWith(IPC.remoteHostCanvasState, { nodes: [] })
    route.remoteHost.approve('id1')
    expect(h.send).toHaveBeenCalledWith(IPC.remoteHostApprove, { id: 'id1' })
    route.remoteHost.reject('id1')
    expect(h.send).toHaveBeenCalledWith(IPC.remoteHostReject, { id: 'id1' })
    route.remoteHost.setPhoneAccess(true)
    expect(h.send).toHaveBeenCalledWith(IPC.remoteStandingHostSet, true)

    const muts: unknown[] = []
    route.remoteHost.onApplyMutation((m: unknown) => muts.push(m))
    fire(IPC.remoteHostApplyMutation, { type: 'x' })
    expect(muts).toEqual([{ type: 'x' }])

    const pending: Array<{ sas: string | null; id: string }> = []
    route.remoteHost.onPeerPending((p: { sas: string | null; id: string }) => pending.push(p))
    fire(IPC.remoteHostPeerPending, { sas: 'SAS', id: 'i' })
    expect(pending).toEqual([{ sas: 'SAS', id: 'i' }])
  })

  it('relayHost routes start/invite/stop/revoke/confirm + fan-out events', () => {
    route.relayHost.start('p1')
    expect(h.invoke).toHaveBeenCalledWith(IPC.relayHostStart, 'p1')
    route.relayHost.start()
    expect(h.invoke).toHaveBeenCalledWith(IPC.relayHostStart, undefined)
    route.relayHost.invite()
    expect(h.invoke).toHaveBeenCalledWith(IPC.relayHostInvite, {})
    route.relayHost.invite({ projectId: 'p1', email: 'a@b' })
    expect(h.invoke).toHaveBeenCalledWith(IPC.relayHostInvite, { projectId: 'p1', email: 'a@b' })
    route.relayHost.stop()
    expect(h.invoke).toHaveBeenCalledWith(IPC.relayHostStop)
    route.relayHost.revoke('p1')
    expect(h.send).toHaveBeenCalledWith(IPC.relayHostRevoke, { id: 'p1' })
    route.relayHost.confirm('p1')
    expect(h.send).toHaveBeenCalledWith(IPC.relayHostConfirm, { id: 'p1' })

    const pendings: unknown[] = []
    route.relayHost.onPeerPending((p: unknown) => pendings.push(p))
    fire(IPC.relayHostPeerPending, { id: 'x' })
    expect(pendings).toEqual([{ id: 'x' }])
    const opens: Array<{ id: string; email?: string }> = []
    route.relayHost.onOpen((o: { id: string; email?: string }) => opens.push(o))
    fire(IPC.relayHostOpen, { id: 'x', email: 'a' })
    expect(opens).toEqual([{ id: 'x', email: 'a' }])
    const closeds: Array<{ id: string }> = []
    route.relayHost.onClosed((c: { id: string }) => closeds.push(c))
    fire(IPC.relayHostClosed, { id: 'x' })
    expect(closeds).toEqual([{ id: 'x' }])
  })

  it('relayClient routes connect + per-connection sas/approved/frame/closed/confirm/send', () => {
    route.relayClient.connect('offer')
    expect(h.invoke).toHaveBeenCalledWith(IPC.relayClientConnect, 'offer')
    route.relayClient.confirm('c1')
    expect(h.send).toHaveBeenCalledWith(IPC.relayClientConfirm, { id: 'c1' })
    route.relayClient.send('c1', 'frame')
    expect(h.send).toHaveBeenCalledWith(IPC.relayClientSend, 'c1', 'frame')
    route.relayClient.disconnect('c1')
    expect(h.send).toHaveBeenCalledWith(IPC.relayClientDisconnect, 'c1')

    const sas: Array<string | null> = []
    route.relayClient.onSas('c1', (s: string | null) => sas.push(s))
    fire(IPC.relayClientSas('c1'), 'CHANNEL_SAS')
    expect(sas).toEqual(['CHANNEL_SAS'])

    let approved = 0
    route.relayClient.onApproved('c1', () => approved++)
    expect(() => fire(IPC.relayClientApproved('c1'))).not.toThrow()
    expect(approved).toBe(1)

    const frames: string[] = []
    route.relayClient.onFrame('c1', (f: string) => frames.push(f))
    fire(IPC.relayClientFrame('c1'), 'inbound')
    expect(frames).toEqual(['inbound'])

    let closed = 0
    route.relayClient.onClosed('c1', () => closed++)
    expect(() => fire(IPC.relayClientClosed('c1'))).not.toThrow()
    expect(closed).toBe(1)
  })

  it('presence routes the hello request, the casts, and the two subscriptions', () => {
    route.presence.hello({ name: 'me', color: 'c' })
    expect(h.invoke).toHaveBeenCalledWith(IPC.presenceHello, { name: 'me', color: 'c' })
    route.presence.cursor({ x: 1, y: 2 })
    expect(h.send).toHaveBeenCalledWith(IPC.presenceCursor, { x: 1, y: 2 })
    route.presence.focus('n1')
    expect(h.send).toHaveBeenCalledWith(IPC.presenceFocus, 'n1')
    route.presence.chat('hi')
    expect(h.send).toHaveBeenCalledWith(IPC.presenceChat, 'hi')
    route.presence.dino({ nodeId: 'n', snap: {} })
    expect(h.send).toHaveBeenCalledWith(IPC.presenceDino, { nodeId: 'n', snap: {} })
    route.presence.project('p1')
    expect(h.send).toHaveBeenCalledWith(IPC.presenceProject, 'p1')

    const syncs: unknown[] = []
    route.presence.onSync((p: unknown) => syncs.push(p))
    fire(IPC.presenceSync, [{ id: 'peer' }])
    expect(syncs).toEqual([[{ id: 'peer' }]])

    const peers: unknown[] = []
    route.presence.onPeer((p: unknown) => peers.push(p))
    fire(IPC.presencePeer, { id: 'peer2', delta: 1 })
    expect(peers).toEqual([{ id: 'peer2', delta: 1 }])
  })

  it('pairing + handoff + contextLink + boardLog route correctly', async () => {
    await route.handoff.build('s1', 'a1', 'n1', '/cwd', 'acc')
    expect(h.invoke).toHaveBeenCalledWith(IPC.handoffBuild, 's1', 'a1', 'n1', '/cwd', 'acc')

    route.pairing.start()
    expect(h.invoke).toHaveBeenCalledWith(IPC.pairingStart)
    route.pairing.stop()
    expect(h.invoke).toHaveBeenCalledWith(IPC.pairingStop)
    await route.pairing.probeSsh()
    expect(h.invoke).toHaveBeenCalledWith(IPC.pairingProbeSsh)
    await route.pairing.openRemoteLoginSettings()
    expect(h.invoke).toHaveBeenCalledWith(IPC.pairingOpenRemoteLoginSettings)
    await route.pairing.listDevices()
    expect(h.invoke).toHaveBeenCalledWith(IPC.pairingListDevices)
    await route.pairing.revokeDevice('id')
    expect(h.invoke).toHaveBeenCalledWith(IPC.pairingRevokeDevice, 'id')
    const done: unknown[] = []
    route.pairing.onDone((r: unknown) => done.push(r))
    fire(IPC.pairingDone, { ok: true })
    expect(done).toEqual([{ ok: true }])

    await route.contextLink.setLinks([{ id: 'a' }])
    expect(h.invoke).toHaveBeenCalledWith(IPC.contextLinkSetLinks, [{ id: 'a' }])
    await route.contextLink.info()
    expect(h.invoke).toHaveBeenCalledWith(IPC.contextLinkInfo)

    await route.boardLog.append('p1', { ts: 1, kind: 'event' })
    expect(h.invoke).toHaveBeenCalledWith(IPC.boardLogAppend, 'p1', { ts: 1, kind: 'event' })
    await route.boardLog.read('p1', { after: 0 })
    expect(h.invoke).toHaveBeenCalledWith(IPC.boardLogRead, 'p1', { after: 0 })
    let changed = 0
    const unsub = route.boardLog.onChanged('p1', () => changed++)
    expect(h.on).toHaveBeenCalledWith(IPC.boardLogChanged('p1'), expect.any(Function))
    expect(h.send).toHaveBeenCalledWith(IPC.boardLogSubscribe, 'p1')
    fire(IPC.boardLogChanged('p1'))
    expect(changed).toBe(1)
    unsub()
    expect(h.removeListener).toHaveBeenCalledWith(IPC.boardLogChanged('p1'), expect.any(Function))
    expect(h.send).toHaveBeenCalledWith(IPC.boardLogUnsubscribe, 'p1')
  })
})

describe('preload app-level surface', () => {
  it('markdown/close-node fan-out subscriptions multiplex onto one native listener each', () => {
    const a: string[] = []
    const b: string[] = []
    const unsubA = api.onMarkdownToggle(() => a.push('x'))
    const unsubB = api.onMarkdownToggle(() => b.push('x'))
    // Both renderer subscribers must share ONE ipcRenderer listener (MaxListeners guard).
    expect(onCount(IPC.appToggleMarkdown)).toBe(1)

    fire(IPC.appToggleMarkdown)
    expect(a).toEqual(['x'])
    expect(b).toEqual(['x'])

    const call = h.on.mock.calls.find((c) => c[0] === IPC.appToggleMarkdown)!
    // Unsubscribing one keeps the shared handler (other subscriber still attached).
    unsubA()
    expect(h.removeListener).not.toHaveBeenCalledWith(IPC.appToggleMarkdown, call[1])
    unsubB()
    // Last subscriber gone -> handler removed and nulled.
    expect(h.removeListener).toHaveBeenCalledWith(IPC.appToggleMarkdown, call[1])
  })

  it('close-node fan-out is its own channel, separate from markdown', () => {
    const got: string[] = []
    api.onCloseNode(() => got.push('n9'))
    expect(onCount(IPC.appCloseNode)).toBe(1)
    expect(onCount(IPC.appToggleMarkdown)).toBe(0) // not shared with markdown
    fire(IPC.appCloseNode)
    expect(got).toEqual(['n9'])
  })

  it('close/focus windows + badge + focus-node + notification/invoke surface route correctly', async () => {
    route.closeWindow()
    expect(h.send).toHaveBeenCalledWith(IPC.appCloseWindow)
    route.focusWindow()
    expect(h.send).toHaveBeenCalledWith(IPC.appFocusWindow)
    route.setBadgeCount(7)
    expect(h.send).toHaveBeenCalledWith(IPC.appSetBadge, 7)
    await route.userDataDir()
    expect(h.invoke).toHaveBeenCalledWith(IPC.appUserDataDir)
    await route.notify({ title: 'hi' })
    expect(h.invoke).toHaveBeenCalledWith(IPC.appNotify, { title: 'hi' })
    await route.openNotificationSettings()
    expect(h.invoke).toHaveBeenCalledWith(IPC.appOpenNotificationSettings)

    const focused: string[] = []
    route.onFocusNode((id: string) => focused.push(id))
    fire(IPC.appFocusNode, 'n1')
    expect(focused).toEqual(['n1'])
  })

  it('getPathForFile delegates to webUtils.getPathForFile', () => {
    const file = { name: 'x.txt' } as File
    expect(api.getPathForFile(file)).toBe('/path/x.txt')
    expect(h.getPathForFile).toHaveBeenCalledWith(file)
  })

  it('agent control permissions/ack/unread/status/activity route to their channels', async () => {
    await route.answerPermission({ nodeId: 'n1', pendingId: 'p', decision: 'allow' })
    expect(h.invoke).toHaveBeenCalledWith(IPC.agentAnswerPermission, {
      nodeId: 'n1',
      pendingId: 'p',
      decision: 'allow'
    })
    route.ackDone('n1')
    expect(h.invoke).toHaveBeenCalledWith(IPC.agentAckDone, 'n1')
    route.sendAgentControlResult({ requestId: 'r', ok: true })
    expect(h.send).toHaveBeenCalledWith(IPC.agentControlResult, { requestId: 'r', ok: true })

    const unread: string[] = []
    route.onUnreadClear((id: string) => unread.push(id))
    fire(IPC.agentUnreadClear, 'n2')
    expect(unread).toEqual(['n2'])

    const status: unknown[] = []
    route.onAgentStatus((p: unknown) => status.push(p))
    fire(IPC.agentStatus, { running: true })
    expect(status).toEqual([{ running: true }])

    const activity: unknown[] = []
    route.onSubagentActivity((p: unknown) => activity.push(p))
    fire(IPC.agentSubagentActivity, { sub: 1 })
    expect(activity).toEqual([{ sub: 1 }])

    const ctrl: unknown[] = []
    route.onAgentControl((c: unknown) => ctrl.push(c))
    fire(IPC.agentControl, { kind: 'stop' })
    expect(ctrl).toEqual([{ kind: 'stop' }])
  })
})

describe('preload bridge integrity', () => {
  it('exposes the API object under the window key the renderer reads', () => {
    expect(h.exposed.nodeTerminal).toBeDefined()
  })

  it('shares each fan-out event channel among many subscribers (no MaxListeners pileup)', () => {
    const before = onCount(IPC.relayHostOpen)
    route.relayHost.onOpen(() => {})
    expect(onCount(IPC.relayHostOpen)).toBe(before) // identical single listener reused
  })
})