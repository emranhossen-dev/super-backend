export class CreateReviewDto {
  userName: string;
  rating?: number;
  comment: string;
  avatar?: string;
  image?: string;
  role?: string;
  productId?: string;
  isHomepage?: boolean;
  status?: string;
}

export class UpdateReviewDto {
  userName?: string;
  rating?: number;
  comment?: string;
  avatar?: string;
  image?: string;
  role?: string;
  productId?: string;
  isHomepage?: boolean;
  status?: string;
}
