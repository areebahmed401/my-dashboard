// External tools linked from the sidebar; logos live in public/tools/
export interface Tool {
  label: string
  href: string
  logo: string
}

const logo = (file: string) => `${import.meta.env.BASE_URL}tools/${file}`

export const TOOLS: Tool[] = [
  {
    label: 'Engineering Toolkit',
    href: 'https://areebahmed401.github.io/aa-engineering-toolkit/#/',
    logo: logo('engineering-toolkit.svg'),
  },
  {
    label: 'DeutschWeg',
    href: 'https://areebahmed401.github.io/learning-german/#/cards',
    logo: logo('deutschweg.svg'),
  },
  {
    label: 'Portfolio',
    href: 'https://areebahmed401.github.io/my-portfolio/',
    logo: logo('portfolio.svg'),
  },
]
