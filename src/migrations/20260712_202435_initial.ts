import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('zh', 'en');
  CREATE TYPE "public"."enum_admins_roles" AS ENUM('admin', 'editor');
  CREATE TYPE "public"."enum_cases_video_type" AS ENUM('selfHosted', 'embed');
  CREATE TYPE "public"."enum_cases_video_embed_provider" AS ENUM('tencent', 'bilibili');
  CREATE TYPE "public"."enum_cases_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__cases_v_version_video_type" AS ENUM('selfHosted', 'embed');
  CREATE TYPE "public"."enum__cases_v_version_video_embed_provider" AS ENUM('tencent', 'bilibili');
  CREATE TYPE "public"."enum__cases_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__cases_v_published_locale" AS ENUM('zh', 'en');
  CREATE TYPE "public"."enum_services_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__services_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__services_v_published_locale" AS ENUM('zh', 'en');
  CREATE TYPE "public"."enum_news_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__news_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__news_v_published_locale" AS ENUM('zh', 'en');
  CREATE TYPE "public"."enum_notifications_channel" AS ENUM('email', 'sms');
  CREATE TYPE "public"."enum_notifications_status" AS ENUM('pending', 'sent', 'failed');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'notify');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'notify');
  CREATE TYPE "public"."enum_site_settings_analytics_provider" AS ENUM('none', 'baidu', 'google', 'umami');
  CREATE TYPE "public"."enum_home_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__home_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__home_v_published_locale" AS ENUM('zh', 'en');
  CREATE TYPE "public"."enum_about_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__about_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__about_v_published_locale" AS ENUM('zh', 'en');
  CREATE TYPE "public"."enum_contact_map_provider" AS ENUM('amap', 'baidu', 'tencent');
  CREATE TYPE "public"."enum_contact_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__contact_v_version_map_provider" AS ENUM('amap', 'baidu', 'tencent');
  CREATE TYPE "public"."enum__contact_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__contact_v_published_locale" AS ENUM('zh', 'en');
  CREATE TABLE "admins_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_admins_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "admins_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "admins" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar
  );
  
  CREATE TABLE "media_locales" (
  	"alt" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "cases" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"slug" varchar,
  	"cover_id" integer,
  	"video_type" "enum_cases_video_type",
  	"video_file_id" integer,
  	"video_embed_provider" "enum_cases_video_embed_provider",
  	"video_embed_video_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_cases_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cases_locales" (
  	"title" varchar,
  	"client" varchar,
  	"intro" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "cases_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"services_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "_cases_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version__order" varchar,
  	"version_slug" varchar,
  	"version_cover_id" integer,
  	"version_video_type" "enum__cases_v_version_video_type",
  	"version_video_file_id" integer,
  	"version_video_embed_provider" "enum__cases_v_version_video_embed_provider",
  	"version_video_embed_video_id" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__cases_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__cases_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_cases_v_locales" (
  	"version_title" varchar,
  	"version_client" varchar,
  	"version_intro" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_cases_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"services_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "services" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"slug" varchar,
  	"icon_id" integer,
  	"cover_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_services_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "services_locales" (
  	"title" varchar,
  	"summary" varchar,
  	"detail" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version__order" varchar,
  	"version_slug" varchar,
  	"version_icon_id" integer,
  	"version_cover_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__services_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__services_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_services_v_locales" (
  	"version_title" varchar,
  	"version_summary" varchar,
  	"version_detail" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "news" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"cover_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_news_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "news_locales" (
  	"title" varchar,
  	"excerpt" varchar,
  	"body" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_news_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_cover_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__news_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__news_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_news_v_locales" (
  	"version_title" varchar,
  	"version_excerpt" varchar,
  	"version_body" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "inquiries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"company" varchar,
  	"service_interest_id" integer,
  	"message" varchar,
  	"consent" boolean DEFAULT false NOT NULL,
  	"locale_from" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "notifications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"inquiry_id" integer NOT NULL,
  	"channel" "enum_notifications_channel" NOT NULL,
  	"status" "enum_notifications_status" DEFAULT 'pending' NOT NULL,
  	"provider_id" varchar,
  	"error" varchar,
  	"attempts" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "rate_limit_hits" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"bucket_key" varchar NOT NULL,
  	"count" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"concurrency_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"media_id" integer,
  	"cases_id" integer,
  	"services_id" integer,
  	"news_id" integer,
  	"inquiries_id" integer,
  	"notifications_id" integer,
  	"rate_limit_hits_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings_nav" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_social" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"brand_color" varchar DEFAULT '#5CC8FF',
  	"footer_icp" varchar,
  	"footer_public_security" varchar,
  	"default_seo_og_image_id" integer,
  	"analytics_provider" "enum_site_settings_analytics_provider" DEFAULT 'none',
  	"analytics_measurement_id" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_settings_locales" (
  	"site_name" varchar NOT NULL,
  	"footer_text" varchar,
  	"default_seo_title" varchar,
  	"default_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "home" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_background_id" integer,
  	"hero_cta_href" varchar,
  	"contact_cta_cta_href" varchar,
  	"_status" "enum_home_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "home_locales" (
  	"hero_title" varchar,
  	"hero_subtitle" varchar,
  	"hero_cta_label" varchar,
  	"intro" jsonb,
  	"contact_cta_title" varchar,
  	"contact_cta_cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "home_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"services_id" integer,
  	"cases_id" integer
  );
  
  CREATE TABLE "_home_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_hero_background_id" integer,
  	"version_hero_cta_href" varchar,
  	"version_contact_cta_cta_href" varchar,
  	"version__status" "enum__home_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__home_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_home_v_locales" (
  	"version_hero_title" varchar,
  	"version_hero_subtitle" varchar,
  	"version_hero_cta_label" varchar,
  	"version_intro" jsonb,
  	"version_contact_cta_title" varchar,
  	"version_contact_cta_cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_home_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"services_id" integer,
  	"cases_id" integer
  );
  
  CREATE TABLE "about_team" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"avatar_id" integer
  );
  
  CREATE TABLE "about_team_locales" (
  	"name" varchar,
  	"role" varchar,
  	"bio" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "about_clients" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"logo_id" integer
  );
  
  CREATE TABLE "about_clients_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "about_awards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"year" varchar
  );
  
  CREATE TABLE "about_awards_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "about" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_status" "enum_about_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "about_locales" (
  	"intro" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_about_v_version_team" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"avatar_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_about_v_version_team_locales" (
  	"name" varchar,
  	"role" varchar,
  	"bio" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_about_v_version_clients" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_about_v_version_clients_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_about_v_version_awards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"year" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_about_v_version_awards_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_about_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version__status" "enum__about_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__about_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_about_v_locales" (
  	"version_intro" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "contact_social" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" varchar,
  	"url" varchar
  );
  
  CREATE TABLE "contact" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar,
  	"phone" varchar,
  	"map_lat" numeric,
  	"map_lng" numeric,
  	"map_provider" "enum_contact_map_provider",
  	"_status" "enum_contact_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "contact_locales" (
  	"address" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_contact_v_version_social" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"platform" varchar,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_contact_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_email" varchar,
  	"version_phone" varchar,
  	"version_map_lat" numeric,
  	"version_map_lng" numeric,
  	"version_map_provider" "enum__contact_v_version_map_provider",
  	"version__status" "enum__contact_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__contact_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_contact_v_locales" (
  	"version_address" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "admins_roles" ADD CONSTRAINT "admins_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "admins_sessions" ADD CONSTRAINT "admins_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cases" ADD CONSTRAINT "cases_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cases" ADD CONSTRAINT "cases_video_file_id_media_id_fk" FOREIGN KEY ("video_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cases_locales" ADD CONSTRAINT "cases_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cases_locales" ADD CONSTRAINT "cases_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cases_rels" ADD CONSTRAINT "cases_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cases_rels" ADD CONSTRAINT "cases_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cases_rels" ADD CONSTRAINT "cases_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cases_v" ADD CONSTRAINT "_cases_v_parent_id_cases_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cases_v" ADD CONSTRAINT "_cases_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cases_v" ADD CONSTRAINT "_cases_v_version_video_file_id_media_id_fk" FOREIGN KEY ("version_video_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cases_v_locales" ADD CONSTRAINT "_cases_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_cases_v_locales" ADD CONSTRAINT "_cases_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_cases_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cases_v_rels" ADD CONSTRAINT "_cases_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_cases_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cases_v_rels" ADD CONSTRAINT "_cases_v_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cases_v_rels" ADD CONSTRAINT "_cases_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services" ADD CONSTRAINT "services_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "services" ADD CONSTRAINT "services_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "services_locales" ADD CONSTRAINT "services_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "services_locales" ADD CONSTRAINT "services_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v" ADD CONSTRAINT "_services_v_parent_id_services_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_services_v" ADD CONSTRAINT "_services_v_version_icon_id_media_id_fk" FOREIGN KEY ("version_icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_services_v" ADD CONSTRAINT "_services_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_services_v_locales" ADD CONSTRAINT "_services_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_services_v_locales" ADD CONSTRAINT "_services_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news" ADD CONSTRAINT "news_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news_locales" ADD CONSTRAINT "news_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news_locales" ADD CONSTRAINT "news_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_parent_id_news_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."news"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v_locales" ADD CONSTRAINT "_news_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v_locales" ADD CONSTRAINT "_news_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_service_interest_id_services_id_fk" FOREIGN KEY ("service_interest_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cases_fk" FOREIGN KEY ("cases_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_news_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_inquiries_fk" FOREIGN KEY ("inquiries_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_notifications_fk" FOREIGN KEY ("notifications_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_rate_limit_hits_fk" FOREIGN KEY ("rate_limit_hits_id") REFERENCES "public"."rate_limit_hits"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_nav" ADD CONSTRAINT "site_settings_nav_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_social" ADD CONSTRAINT "site_settings_social_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_default_seo_og_image_id_media_id_fk" FOREIGN KEY ("default_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_locales" ADD CONSTRAINT "site_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home" ADD CONSTRAINT "home_hero_background_id_media_id_fk" FOREIGN KEY ("hero_background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_locales" ADD CONSTRAINT "home_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_rels" ADD CONSTRAINT "home_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_rels" ADD CONSTRAINT "home_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_rels" ADD CONSTRAINT "home_rels_cases_fk" FOREIGN KEY ("cases_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_v" ADD CONSTRAINT "_home_v_version_hero_background_id_media_id_fk" FOREIGN KEY ("version_hero_background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v_locales" ADD CONSTRAINT "_home_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_v_rels" ADD CONSTRAINT "_home_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_home_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_v_rels" ADD CONSTRAINT "_home_v_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_v_rels" ADD CONSTRAINT "_home_v_rels_cases_fk" FOREIGN KEY ("cases_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_team" ADD CONSTRAINT "about_team_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_team" ADD CONSTRAINT "about_team_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_team_locales" ADD CONSTRAINT "about_team_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_team"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_clients" ADD CONSTRAINT "about_clients_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_clients" ADD CONSTRAINT "about_clients_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_clients_locales" ADD CONSTRAINT "about_clients_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_clients"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_awards" ADD CONSTRAINT "about_awards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_awards_locales" ADD CONSTRAINT "about_awards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_awards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_locales" ADD CONSTRAINT "about_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_v_version_team" ADD CONSTRAINT "_about_v_version_team_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_about_v_version_team" ADD CONSTRAINT "_about_v_version_team_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_v_version_team_locales" ADD CONSTRAINT "_about_v_version_team_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_v_version_team"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_v_version_clients" ADD CONSTRAINT "_about_v_version_clients_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_about_v_version_clients" ADD CONSTRAINT "_about_v_version_clients_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_v_version_clients_locales" ADD CONSTRAINT "_about_v_version_clients_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_v_version_clients"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_v_version_awards" ADD CONSTRAINT "_about_v_version_awards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_v_version_awards_locales" ADD CONSTRAINT "_about_v_version_awards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_v_version_awards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_v_locales" ADD CONSTRAINT "_about_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contact_social" ADD CONSTRAINT "contact_social_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contact_locales" ADD CONSTRAINT "contact_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_contact_v_version_social" ADD CONSTRAINT "_contact_v_version_social_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_contact_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_contact_v_locales" ADD CONSTRAINT "_contact_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_contact_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "admins_roles_order_idx" ON "admins_roles" USING btree ("order");
  CREATE INDEX "admins_roles_parent_idx" ON "admins_roles" USING btree ("parent_id");
  CREATE INDEX "admins_sessions_order_idx" ON "admins_sessions" USING btree ("_order");
  CREATE INDEX "admins_sessions_parent_id_idx" ON "admins_sessions" USING btree ("_parent_id");
  CREATE INDEX "admins_updated_at_idx" ON "admins" USING btree ("updated_at");
  CREATE INDEX "admins_created_at_idx" ON "admins" USING btree ("created_at");
  CREATE UNIQUE INDEX "admins_email_idx" ON "admins" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "cases__order_idx" ON "cases" USING btree ("_order");
  CREATE UNIQUE INDEX "cases_slug_idx" ON "cases" USING btree ("slug");
  CREATE INDEX "cases_cover_idx" ON "cases" USING btree ("cover_id");
  CREATE INDEX "cases_video_file_idx" ON "cases" USING btree ("video_file_id");
  CREATE INDEX "cases_updated_at_idx" ON "cases" USING btree ("updated_at");
  CREATE INDEX "cases_created_at_idx" ON "cases" USING btree ("created_at");
  CREATE INDEX "cases__status_idx" ON "cases" USING btree ("_status");
  CREATE INDEX "cases_meta_meta_image_idx" ON "cases_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "cases_locales_locale_parent_id_unique" ON "cases_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "cases_rels_order_idx" ON "cases_rels" USING btree ("order");
  CREATE INDEX "cases_rels_parent_idx" ON "cases_rels" USING btree ("parent_id");
  CREATE INDEX "cases_rels_path_idx" ON "cases_rels" USING btree ("path");
  CREATE INDEX "cases_rels_services_id_idx" ON "cases_rels" USING btree ("services_id");
  CREATE INDEX "cases_rels_media_id_idx" ON "cases_rels" USING btree ("media_id");
  CREATE INDEX "_cases_v_parent_idx" ON "_cases_v" USING btree ("parent_id");
  CREATE INDEX "_cases_v_version_version__order_idx" ON "_cases_v" USING btree ("version__order");
  CREATE INDEX "_cases_v_version_version_slug_idx" ON "_cases_v" USING btree ("version_slug");
  CREATE INDEX "_cases_v_version_version_cover_idx" ON "_cases_v" USING btree ("version_cover_id");
  CREATE INDEX "_cases_v_version_version_video_file_idx" ON "_cases_v" USING btree ("version_video_file_id");
  CREATE INDEX "_cases_v_version_version_updated_at_idx" ON "_cases_v" USING btree ("version_updated_at");
  CREATE INDEX "_cases_v_version_version_created_at_idx" ON "_cases_v" USING btree ("version_created_at");
  CREATE INDEX "_cases_v_version_version__status_idx" ON "_cases_v" USING btree ("version__status");
  CREATE INDEX "_cases_v_created_at_idx" ON "_cases_v" USING btree ("created_at");
  CREATE INDEX "_cases_v_updated_at_idx" ON "_cases_v" USING btree ("updated_at");
  CREATE INDEX "_cases_v_snapshot_idx" ON "_cases_v" USING btree ("snapshot");
  CREATE INDEX "_cases_v_published_locale_idx" ON "_cases_v" USING btree ("published_locale");
  CREATE INDEX "_cases_v_latest_idx" ON "_cases_v" USING btree ("latest");
  CREATE INDEX "_cases_v_version_meta_version_meta_image_idx" ON "_cases_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE UNIQUE INDEX "_cases_v_locales_locale_parent_id_unique" ON "_cases_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_cases_v_rels_order_idx" ON "_cases_v_rels" USING btree ("order");
  CREATE INDEX "_cases_v_rels_parent_idx" ON "_cases_v_rels" USING btree ("parent_id");
  CREATE INDEX "_cases_v_rels_path_idx" ON "_cases_v_rels" USING btree ("path");
  CREATE INDEX "_cases_v_rels_services_id_idx" ON "_cases_v_rels" USING btree ("services_id");
  CREATE INDEX "_cases_v_rels_media_id_idx" ON "_cases_v_rels" USING btree ("media_id");
  CREATE INDEX "services__order_idx" ON "services" USING btree ("_order");
  CREATE UNIQUE INDEX "services_slug_idx" ON "services" USING btree ("slug");
  CREATE INDEX "services_icon_idx" ON "services" USING btree ("icon_id");
  CREATE INDEX "services_cover_idx" ON "services" USING btree ("cover_id");
  CREATE INDEX "services_updated_at_idx" ON "services" USING btree ("updated_at");
  CREATE INDEX "services_created_at_idx" ON "services" USING btree ("created_at");
  CREATE INDEX "services__status_idx" ON "services" USING btree ("_status");
  CREATE INDEX "services_meta_meta_image_idx" ON "services_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "services_locales_locale_parent_id_unique" ON "services_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_parent_idx" ON "_services_v" USING btree ("parent_id");
  CREATE INDEX "_services_v_version_version__order_idx" ON "_services_v" USING btree ("version__order");
  CREATE INDEX "_services_v_version_version_slug_idx" ON "_services_v" USING btree ("version_slug");
  CREATE INDEX "_services_v_version_version_icon_idx" ON "_services_v" USING btree ("version_icon_id");
  CREATE INDEX "_services_v_version_version_cover_idx" ON "_services_v" USING btree ("version_cover_id");
  CREATE INDEX "_services_v_version_version_updated_at_idx" ON "_services_v" USING btree ("version_updated_at");
  CREATE INDEX "_services_v_version_version_created_at_idx" ON "_services_v" USING btree ("version_created_at");
  CREATE INDEX "_services_v_version_version__status_idx" ON "_services_v" USING btree ("version__status");
  CREATE INDEX "_services_v_created_at_idx" ON "_services_v" USING btree ("created_at");
  CREATE INDEX "_services_v_updated_at_idx" ON "_services_v" USING btree ("updated_at");
  CREATE INDEX "_services_v_snapshot_idx" ON "_services_v" USING btree ("snapshot");
  CREATE INDEX "_services_v_published_locale_idx" ON "_services_v" USING btree ("published_locale");
  CREATE INDEX "_services_v_latest_idx" ON "_services_v" USING btree ("latest");
  CREATE INDEX "_services_v_version_meta_version_meta_image_idx" ON "_services_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE UNIQUE INDEX "_services_v_locales_locale_parent_id_unique" ON "_services_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "news_slug_idx" ON "news" USING btree ("slug");
  CREATE INDEX "news_cover_idx" ON "news" USING btree ("cover_id");
  CREATE INDEX "news_updated_at_idx" ON "news" USING btree ("updated_at");
  CREATE INDEX "news_created_at_idx" ON "news" USING btree ("created_at");
  CREATE INDEX "news__status_idx" ON "news" USING btree ("_status");
  CREATE INDEX "news_meta_meta_image_idx" ON "news_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "news_locales_locale_parent_id_unique" ON "news_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_news_v_parent_idx" ON "_news_v" USING btree ("parent_id");
  CREATE INDEX "_news_v_version_version_slug_idx" ON "_news_v" USING btree ("version_slug");
  CREATE INDEX "_news_v_version_version_cover_idx" ON "_news_v" USING btree ("version_cover_id");
  CREATE INDEX "_news_v_version_version_updated_at_idx" ON "_news_v" USING btree ("version_updated_at");
  CREATE INDEX "_news_v_version_version_created_at_idx" ON "_news_v" USING btree ("version_created_at");
  CREATE INDEX "_news_v_version_version__status_idx" ON "_news_v" USING btree ("version__status");
  CREATE INDEX "_news_v_created_at_idx" ON "_news_v" USING btree ("created_at");
  CREATE INDEX "_news_v_updated_at_idx" ON "_news_v" USING btree ("updated_at");
  CREATE INDEX "_news_v_snapshot_idx" ON "_news_v" USING btree ("snapshot");
  CREATE INDEX "_news_v_published_locale_idx" ON "_news_v" USING btree ("published_locale");
  CREATE INDEX "_news_v_latest_idx" ON "_news_v" USING btree ("latest");
  CREATE INDEX "_news_v_version_meta_version_meta_image_idx" ON "_news_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE UNIQUE INDEX "_news_v_locales_locale_parent_id_unique" ON "_news_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "inquiries_service_interest_idx" ON "inquiries" USING btree ("service_interest_id");
  CREATE INDEX "inquiries_updated_at_idx" ON "inquiries" USING btree ("updated_at");
  CREATE INDEX "inquiries_created_at_idx" ON "inquiries" USING btree ("created_at");
  CREATE INDEX "notifications_inquiry_idx" ON "notifications" USING btree ("inquiry_id");
  CREATE INDEX "notifications_updated_at_idx" ON "notifications" USING btree ("updated_at");
  CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");
  CREATE UNIQUE INDEX "inquiry_channel_idx" ON "notifications" USING btree ("inquiry_id","channel");
  CREATE UNIQUE INDEX "rate_limit_hits_bucket_key_idx" ON "rate_limit_hits" USING btree ("bucket_key");
  CREATE INDEX "rate_limit_hits_updated_at_idx" ON "rate_limit_hits" USING btree ("updated_at");
  CREATE INDEX "rate_limit_hits_created_at_idx" ON "rate_limit_hits" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_concurrency_key_idx" ON "payload_jobs" USING btree ("concurrency_key");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_admins_id_idx" ON "payload_locked_documents_rels" USING btree ("admins_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_cases_id_idx" ON "payload_locked_documents_rels" USING btree ("cases_id");
  CREATE INDEX "payload_locked_documents_rels_services_id_idx" ON "payload_locked_documents_rels" USING btree ("services_id");
  CREATE INDEX "payload_locked_documents_rels_news_id_idx" ON "payload_locked_documents_rels" USING btree ("news_id");
  CREATE INDEX "payload_locked_documents_rels_inquiries_id_idx" ON "payload_locked_documents_rels" USING btree ("inquiries_id");
  CREATE INDEX "payload_locked_documents_rels_notifications_id_idx" ON "payload_locked_documents_rels" USING btree ("notifications_id");
  CREATE INDEX "payload_locked_documents_rels_rate_limit_hits_id_idx" ON "payload_locked_documents_rels" USING btree ("rate_limit_hits_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_admins_id_idx" ON "payload_preferences_rels" USING btree ("admins_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "site_settings_nav_order_idx" ON "site_settings_nav" USING btree ("_order");
  CREATE INDEX "site_settings_nav_parent_id_idx" ON "site_settings_nav" USING btree ("_parent_id");
  CREATE INDEX "site_settings_nav_locale_idx" ON "site_settings_nav" USING btree ("_locale");
  CREATE INDEX "site_settings_social_order_idx" ON "site_settings_social" USING btree ("_order");
  CREATE INDEX "site_settings_social_parent_id_idx" ON "site_settings_social" USING btree ("_parent_id");
  CREATE INDEX "site_settings_logo_idx" ON "site_settings" USING btree ("logo_id");
  CREATE INDEX "site_settings_default_seo_default_seo_og_image_idx" ON "site_settings" USING btree ("default_seo_og_image_id");
  CREATE UNIQUE INDEX "site_settings_locales_locale_parent_id_unique" ON "site_settings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "home_hero_hero_background_idx" ON "home" USING btree ("hero_background_id");
  CREATE INDEX "home__status_idx" ON "home" USING btree ("_status");
  CREATE UNIQUE INDEX "home_locales_locale_parent_id_unique" ON "home_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "home_rels_order_idx" ON "home_rels" USING btree ("order");
  CREATE INDEX "home_rels_parent_idx" ON "home_rels" USING btree ("parent_id");
  CREATE INDEX "home_rels_path_idx" ON "home_rels" USING btree ("path");
  CREATE INDEX "home_rels_services_id_idx" ON "home_rels" USING btree ("services_id");
  CREATE INDEX "home_rels_cases_id_idx" ON "home_rels" USING btree ("cases_id");
  CREATE INDEX "_home_v_version_hero_version_hero_background_idx" ON "_home_v" USING btree ("version_hero_background_id");
  CREATE INDEX "_home_v_version_version__status_idx" ON "_home_v" USING btree ("version__status");
  CREATE INDEX "_home_v_created_at_idx" ON "_home_v" USING btree ("created_at");
  CREATE INDEX "_home_v_updated_at_idx" ON "_home_v" USING btree ("updated_at");
  CREATE INDEX "_home_v_snapshot_idx" ON "_home_v" USING btree ("snapshot");
  CREATE INDEX "_home_v_published_locale_idx" ON "_home_v" USING btree ("published_locale");
  CREATE INDEX "_home_v_latest_idx" ON "_home_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_home_v_locales_locale_parent_id_unique" ON "_home_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_home_v_rels_order_idx" ON "_home_v_rels" USING btree ("order");
  CREATE INDEX "_home_v_rels_parent_idx" ON "_home_v_rels" USING btree ("parent_id");
  CREATE INDEX "_home_v_rels_path_idx" ON "_home_v_rels" USING btree ("path");
  CREATE INDEX "_home_v_rels_services_id_idx" ON "_home_v_rels" USING btree ("services_id");
  CREATE INDEX "_home_v_rels_cases_id_idx" ON "_home_v_rels" USING btree ("cases_id");
  CREATE INDEX "about_team_order_idx" ON "about_team" USING btree ("_order");
  CREATE INDEX "about_team_parent_id_idx" ON "about_team" USING btree ("_parent_id");
  CREATE INDEX "about_team_avatar_idx" ON "about_team" USING btree ("avatar_id");
  CREATE UNIQUE INDEX "about_team_locales_locale_parent_id_unique" ON "about_team_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "about_clients_order_idx" ON "about_clients" USING btree ("_order");
  CREATE INDEX "about_clients_parent_id_idx" ON "about_clients" USING btree ("_parent_id");
  CREATE INDEX "about_clients_logo_idx" ON "about_clients" USING btree ("logo_id");
  CREATE UNIQUE INDEX "about_clients_locales_locale_parent_id_unique" ON "about_clients_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "about_awards_order_idx" ON "about_awards" USING btree ("_order");
  CREATE INDEX "about_awards_parent_id_idx" ON "about_awards" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "about_awards_locales_locale_parent_id_unique" ON "about_awards_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "about__status_idx" ON "about" USING btree ("_status");
  CREATE UNIQUE INDEX "about_locales_locale_parent_id_unique" ON "about_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_about_v_version_team_order_idx" ON "_about_v_version_team" USING btree ("_order");
  CREATE INDEX "_about_v_version_team_parent_id_idx" ON "_about_v_version_team" USING btree ("_parent_id");
  CREATE INDEX "_about_v_version_team_avatar_idx" ON "_about_v_version_team" USING btree ("avatar_id");
  CREATE UNIQUE INDEX "_about_v_version_team_locales_locale_parent_id_unique" ON "_about_v_version_team_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_about_v_version_clients_order_idx" ON "_about_v_version_clients" USING btree ("_order");
  CREATE INDEX "_about_v_version_clients_parent_id_idx" ON "_about_v_version_clients" USING btree ("_parent_id");
  CREATE INDEX "_about_v_version_clients_logo_idx" ON "_about_v_version_clients" USING btree ("logo_id");
  CREATE UNIQUE INDEX "_about_v_version_clients_locales_locale_parent_id_unique" ON "_about_v_version_clients_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_about_v_version_awards_order_idx" ON "_about_v_version_awards" USING btree ("_order");
  CREATE INDEX "_about_v_version_awards_parent_id_idx" ON "_about_v_version_awards" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_about_v_version_awards_locales_locale_parent_id_unique" ON "_about_v_version_awards_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_about_v_version_version__status_idx" ON "_about_v" USING btree ("version__status");
  CREATE INDEX "_about_v_created_at_idx" ON "_about_v" USING btree ("created_at");
  CREATE INDEX "_about_v_updated_at_idx" ON "_about_v" USING btree ("updated_at");
  CREATE INDEX "_about_v_snapshot_idx" ON "_about_v" USING btree ("snapshot");
  CREATE INDEX "_about_v_published_locale_idx" ON "_about_v" USING btree ("published_locale");
  CREATE INDEX "_about_v_latest_idx" ON "_about_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_about_v_locales_locale_parent_id_unique" ON "_about_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "contact_social_order_idx" ON "contact_social" USING btree ("_order");
  CREATE INDEX "contact_social_parent_id_idx" ON "contact_social" USING btree ("_parent_id");
  CREATE INDEX "contact__status_idx" ON "contact" USING btree ("_status");
  CREATE UNIQUE INDEX "contact_locales_locale_parent_id_unique" ON "contact_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_contact_v_version_social_order_idx" ON "_contact_v_version_social" USING btree ("_order");
  CREATE INDEX "_contact_v_version_social_parent_id_idx" ON "_contact_v_version_social" USING btree ("_parent_id");
  CREATE INDEX "_contact_v_version_version__status_idx" ON "_contact_v" USING btree ("version__status");
  CREATE INDEX "_contact_v_created_at_idx" ON "_contact_v" USING btree ("created_at");
  CREATE INDEX "_contact_v_updated_at_idx" ON "_contact_v" USING btree ("updated_at");
  CREATE INDEX "_contact_v_snapshot_idx" ON "_contact_v" USING btree ("snapshot");
  CREATE INDEX "_contact_v_published_locale_idx" ON "_contact_v" USING btree ("published_locale");
  CREATE INDEX "_contact_v_latest_idx" ON "_contact_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_contact_v_locales_locale_parent_id_unique" ON "_contact_v_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "admins_roles" CASCADE;
  DROP TABLE "admins_sessions" CASCADE;
  DROP TABLE "admins" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "cases" CASCADE;
  DROP TABLE "cases_locales" CASCADE;
  DROP TABLE "cases_rels" CASCADE;
  DROP TABLE "_cases_v" CASCADE;
  DROP TABLE "_cases_v_locales" CASCADE;
  DROP TABLE "_cases_v_rels" CASCADE;
  DROP TABLE "services" CASCADE;
  DROP TABLE "services_locales" CASCADE;
  DROP TABLE "_services_v" CASCADE;
  DROP TABLE "_services_v_locales" CASCADE;
  DROP TABLE "news" CASCADE;
  DROP TABLE "news_locales" CASCADE;
  DROP TABLE "_news_v" CASCADE;
  DROP TABLE "_news_v_locales" CASCADE;
  DROP TABLE "inquiries" CASCADE;
  DROP TABLE "notifications" CASCADE;
  DROP TABLE "rate_limit_hits" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings_nav" CASCADE;
  DROP TABLE "site_settings_social" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "site_settings_locales" CASCADE;
  DROP TABLE "home" CASCADE;
  DROP TABLE "home_locales" CASCADE;
  DROP TABLE "home_rels" CASCADE;
  DROP TABLE "_home_v" CASCADE;
  DROP TABLE "_home_v_locales" CASCADE;
  DROP TABLE "_home_v_rels" CASCADE;
  DROP TABLE "about_team" CASCADE;
  DROP TABLE "about_team_locales" CASCADE;
  DROP TABLE "about_clients" CASCADE;
  DROP TABLE "about_clients_locales" CASCADE;
  DROP TABLE "about_awards" CASCADE;
  DROP TABLE "about_awards_locales" CASCADE;
  DROP TABLE "about" CASCADE;
  DROP TABLE "about_locales" CASCADE;
  DROP TABLE "_about_v_version_team" CASCADE;
  DROP TABLE "_about_v_version_team_locales" CASCADE;
  DROP TABLE "_about_v_version_clients" CASCADE;
  DROP TABLE "_about_v_version_clients_locales" CASCADE;
  DROP TABLE "_about_v_version_awards" CASCADE;
  DROP TABLE "_about_v_version_awards_locales" CASCADE;
  DROP TABLE "_about_v" CASCADE;
  DROP TABLE "_about_v_locales" CASCADE;
  DROP TABLE "contact_social" CASCADE;
  DROP TABLE "contact" CASCADE;
  DROP TABLE "contact_locales" CASCADE;
  DROP TABLE "_contact_v_version_social" CASCADE;
  DROP TABLE "_contact_v" CASCADE;
  DROP TABLE "_contact_v_locales" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_admins_roles";
  DROP TYPE "public"."enum_cases_video_type";
  DROP TYPE "public"."enum_cases_video_embed_provider";
  DROP TYPE "public"."enum_cases_status";
  DROP TYPE "public"."enum__cases_v_version_video_type";
  DROP TYPE "public"."enum__cases_v_version_video_embed_provider";
  DROP TYPE "public"."enum__cases_v_version_status";
  DROP TYPE "public"."enum__cases_v_published_locale";
  DROP TYPE "public"."enum_services_status";
  DROP TYPE "public"."enum__services_v_version_status";
  DROP TYPE "public"."enum__services_v_published_locale";
  DROP TYPE "public"."enum_news_status";
  DROP TYPE "public"."enum__news_v_version_status";
  DROP TYPE "public"."enum__news_v_published_locale";
  DROP TYPE "public"."enum_notifications_channel";
  DROP TYPE "public"."enum_notifications_status";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  DROP TYPE "public"."enum_site_settings_analytics_provider";
  DROP TYPE "public"."enum_home_status";
  DROP TYPE "public"."enum__home_v_version_status";
  DROP TYPE "public"."enum__home_v_published_locale";
  DROP TYPE "public"."enum_about_status";
  DROP TYPE "public"."enum__about_v_version_status";
  DROP TYPE "public"."enum__about_v_published_locale";
  DROP TYPE "public"."enum_contact_map_provider";
  DROP TYPE "public"."enum_contact_status";
  DROP TYPE "public"."enum__contact_v_version_map_provider";
  DROP TYPE "public"."enum__contact_v_version_status";
  DROP TYPE "public"."enum__contact_v_published_locale";`)
}
