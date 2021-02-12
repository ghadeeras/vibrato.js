import { expect } from 'chai'
import * as types from '../prod/datatypes'

describe('integer', () => {

    it('can read/write aligned integer numbers into raw buffers', () => {
        const buffer = new ArrayBuffer(400)
        const view = types.integer.view(buffer, 0, 100)
        for (let i = 0; i < 100; i++) {
            const n = randomInt32()
            view[i] = n
            expect(view[i]).to.equal(n)
        }
    })

    it('can read/write integer numbers into raw buffers', () => {
        const buffer = new ArrayBuffer(100)
        const view = types.integer.rawView(buffer, 0)
        for (let i = 0; i < 100 - types.integer.sizeInBytes; i++) {
            const n = randomInt32()
            view.set(i, n)
            expect(view.get(i)).to.equal(n)
        }
    })

})

describe('real', () => {

    it('can read/write aligned "real" numbers into raw buffers', () => {
        const buffer = new ArrayBuffer(800)
        const view = types.real.view(buffer, 0, 100)
        for (let i = 0; i < 100; i++) {
            const n = Math.random()
            view[i] = n
            expect(view[i]).to.equal(n)
        }
    })

    it('can read/write "real" numbers into raw buffers', () => {
        const buffer = new ArrayBuffer(100)
        const view = types.real.rawView(buffer, 0)
        for (let i = 0; i < 100 - types.real.sizeInBytes; i++) {
            const n = Math.random()
            view.set(i, n)
            expect(view.get(i)).to.equal(n)
        }
    })

})

function randomInt32(): number {
    return Math.round(Math.random() * (2 ** 32 - 2) - (2 ** 31))
}
