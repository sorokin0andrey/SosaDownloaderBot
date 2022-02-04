export const getProgressBar = (progress: number, length = 20) => {
    const filledCount = Math.round(progress * length)

    const items = Array(length).fill('−').map((_, index) => index < filledCount ? '+' : '−')

    return items.join('')
}

export const noop = () => null
