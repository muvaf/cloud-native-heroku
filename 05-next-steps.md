# Next Steps

Frontend from Backstage, cloud from Crossplane, compute environment from
Kubernetes and finally CI/CD that ties all this together; we have the power to
build our own internal cloud platform!

A few ideas as next steps:
* App repos could open PRs to deployment repo for every push.
* [ArgoCD Image Updater][argocd-image-updater] project could build a continuous
  image update cycle.
* Add input parameters to templates that will let devs choose what cloud
  resources they need.
* Different clusters configured with different `Composition`s to fulfill the
  needs while keeping the Helm charts same!
* Add more tools! Everything is on Kubernetes API!

Feel free to follow me on Twitter for future updates on the tutorial:
https://twitter.com/muvaffakonus .

[argocd-image-updater]: https://argocd-image-updater.readthedocs.io/en/stable/