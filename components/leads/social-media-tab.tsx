"use client";

import { Linkedin, Building2, User, Calendar, Heart, MessageCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface LinkedInPost {
  id: number;
  postUrl: string;
  postedDate: Date | null;
  author: string | null;
  text: string | null;
  reactions: number | null;
  like: number | null;
}

interface SocialMediaTabProps {
  companyPosts?: LinkedInPost[];
  leadPosts?: LinkedInPost[];
  companyName?: string | null;
  personName?: string | null;
}

export function SocialMediaTab({
  companyPosts = [],
  leadPosts = [],
  companyName,
  personName,
}: SocialMediaTabProps) {
  const hasContent = companyPosts.length > 0 || leadPosts.length > 0;

  if (!hasContent) {
    return (
      <div className="text-center py-12">
        <Linkedin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Aucun contenu LinkedIn</h3>
        <p className="text-muted-foreground">
          Aucun post LinkedIn n'est disponible pour ce lead.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Posts LinkedIn de l'entreprise */}
      {companyPosts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5" />
            <h3 className="text-lg font-semibold">
              Posts LinkedIn - {companyName || "Entreprise"}
            </h3>
            <Badge variant="secondary">{companyPosts.length}</Badge>
          </div>
          <div className="space-y-4">
            {companyPosts.map((post) => (
              <Card key={post.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {post.author || companyName || "Entreprise"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {post.postedDate && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(post.postedDate).toLocaleDateString("fr-FR")}
                        </div>
                      )}
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={post.postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-6 w-6 p-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {post.text && (
                    <p className="text-sm leading-relaxed mb-3 whitespace-pre-wrap">
                      {post.text}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {post.reactions !== null && post.reactions > 0 && (
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {post.reactions} réaction{post.reactions > 1 ? "s" : ""}
                      </div>
                    )}
                    {post.like !== null && post.like > 0 && (
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {post.like} like{post.like > 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Posts LinkedIn de la personne */}
      {leadPosts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5" />
            <h3 className="text-lg font-semibold">
              Posts LinkedIn - {personName || "Personne"}
            </h3>
            <Badge variant="secondary">{leadPosts.length}</Badge>
          </div>
          <div className="space-y-4">
            {leadPosts.map((post) => (
              <Card key={post.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {post.author || personName || "Personne"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {post.postedDate && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(post.postedDate).toLocaleDateString("fr-FR")}
                        </div>
                      )}
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={post.postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-6 w-6 p-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {post.text && (
                    <p className="text-sm leading-relaxed mb-3 whitespace-pre-wrap">
                      {post.text}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {post.reactions !== null && post.reactions > 0 && (
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {post.reactions} réaction{post.reactions > 1 ? "s" : ""}
                      </div>
                    )}
                    {post.like !== null && post.like > 0 && (
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {post.like} like{post.like > 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}