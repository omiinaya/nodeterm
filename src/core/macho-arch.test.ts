// Mach-O header reader: arch detection + cross-arch mismatch flagging (spawn-helper clobber).
import { describe, expect, it } from 'vitest'
import { archMismatch, machOArch } from './macho-arch'

function header(fat: boolean, magic: number, cpu: number): Buffer {
  const b = Buffer.alloc(8)
  if (fat) b.writeUInt32BE(0xcafebabe, 0)
  else {
    b.writeUInt32LE(magic, 0)
    b.writeUInt32LE(cpu, 4)
  }
  return b
}

describe('machOArch', () => {
  it('detects arm64', () => {
    expect(machOArch(header(false, 0xfeedfacf, 0x0100000c))).toBe('arm64')
  })
  it('detects x86_64', () => {
    expect(machOArch(header(false, 0xfeedfacf, 0x01000007))).toBe('x86_64')
  })
  it('detects a fat (universal) binary', () => {
    expect(machOArch(header(true, 0, 0))).toBe('universal')
  })
  it('unknown for short buffers, wrong magic, or unknown cpu', () => {
    expect(machOArch(Buffer.alloc(4))).toBe('unknown')
    expect(machOArch(header(false, 0xdeadbeef, 0))).toBe('unknown')
    expect(machOArch(header(false, 0xfeedfacf, 0x12345678))).toBe('unknown')
  })
})

describe('archMismatch', () => {
  it('flags a cross-arch binary, fails open otherwise', () => {
    expect(archMismatch('arm64', 'x64')).toBe(true)
    expect(archMismatch('x86_64', 'arm64')).toBe(true)
    expect(archMismatch('arm64', 'arm64')).toBe(false)
    expect(archMismatch('x86_64', 'x64')).toBe(false)
    expect(archMismatch('universal', 'x64')).toBe(false)
    expect(archMismatch('unknown', 'x64')).toBe(false)
  })
})