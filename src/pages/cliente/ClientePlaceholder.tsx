import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClientePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Em construção</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Esta seção será disponibilizada nas próximas ondas de entrega.
        </CardContent>
      </Card>
    </div>
  );
}
