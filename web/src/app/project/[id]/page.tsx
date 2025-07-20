import ProjectLayout from '@/components/ProjectLayout'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params
  return <ProjectLayout projectId={id} />
}